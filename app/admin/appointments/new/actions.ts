'use server'

import { z } from 'zod'
import { addMinutes, parseISO, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { v4 as uuidv4 } from 'uuid'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSquareServiceById } from '@/lib/square/services'
import { findOrCreateSquareCustomer } from '@/lib/square/customers'
import { createSquareBooking } from '@/lib/square/bookings'
import { invalidateAllSquareCache } from '@/lib/square/admin'

const BUSINESS_TIMEZONE = 'America/Chicago'

const schema = z.object({
  service_id: z.string().min(1, 'Service required'),
  date: z.string().min(1, 'Date required'),
  time: z.string().min(1, 'Time required'),
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone required'),
  notes: z.string().optional(),
})

export interface CreateAdminAppointmentResult {
  ok: boolean
  error?: string
  warning?: string
  bookingId?: string
}

// Square Appointments Plus / Premium subscription is required for
// programmatic booking writes. On the free tier, .create()/.update()/.cancel()
// return 403 FORBIDDEN with this exact merchant subscription message.
function isSquareSubscriptionError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message || ''
  return (
    msg.includes('Merchant subscription does not support write operations') ||
    (msg.includes('FORBIDDEN') && msg.includes('subscription'))
  )
}

export async function createAdminAppointment(
  formData: FormData
): Promise<CreateAdminAppointmentResult> {
  const parsed = schema.safeParse({
    service_id: formData.get('service_id'),
    date: formData.get('date'),
    time: formData.get('time'),
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    notes: formData.get('notes') || '',
  })

  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message || 'Invalid input' }
  }

  const data = parsed.data

  try {
    const service = await getSquareServiceById(data.service_id)
    if (!service) {
      return { ok: false, error: 'Service not found' }
    }

    // Compute UTC start datetime from local CT date+time
    const [hours, minutes] = data.time.split(':').map(Number)
    const localDate = parseISO(data.date)
    const localDateTime = setMinutes(setHours(localDate, hours), minutes)
    const startAt = fromZonedTime(localDateTime, BUSINESS_TIMEZONE).toISOString()
    const endAt = addMinutes(new Date(startAt), service.duration_minutes).toISOString()

    // Find or create the Square customer
    const squareCustomerId = await findOrCreateSquareCustomer({
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
    })

    // Create the Square booking — seller token => auto-ACCEPTED
    if (!service.square_variation_id) {
      return { ok: false, error: 'Service is missing Square variation ID' }
    }

    let squareBookingId: string | null = null
    let squareSubscriptionBlocked = false
    try {
      squareBookingId = await createSquareBooking({
        squareCustomerId,
        squareServiceVariationId: service.square_variation_id,
        startAt,
        durationMinutes: service.duration_minutes,
      })
    } catch (err) {
      if (isSquareSubscriptionError(err)) {
        squareSubscriptionBlocked = true
        console.warn(
          '[appointments] Square subscription blocks create; saving locally only'
        )
      } else {
        throw err
      }
    }

    if (!squareSubscriptionBlocked && !squareBookingId) {
      return { ok: false, error: 'Square did not return a booking ID' }
    }

    // Mirror into Supabase for analytics + future cancellation
    const supabase = createAdminClient()

    // Upsert service so FK relationship works
    await supabase
      .from('services')
      .upsert({
        id: service.id,
        name: service.name,
        description: service.description,
        duration_minutes: service.duration_minutes,
        price_cents: service.price_cents,
        price_display: service.price_display,
        is_active: true,
        sort_order: service.sort_order,
      }, { onConflict: 'id' })

    // Find or create the local client row
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', data.email)
      .single()

    let clientId: string
    if (existingClient) {
      clientId = existingClient.id
      await supabase
        .from('clients')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone,
          square_customer_id: squareCustomerId,
        })
        .eq('id', clientId)
    } else {
      const { data: newClient, error: createErr } = await supabase
        .from('clients')
        .insert({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          square_customer_id: squareCustomerId,
        })
        .select('id')
        .single()

      if (createErr || !newClient) {
        // Square booking already exists; still report partial success
        invalidateAllSquareCache()
        return {
          ok: true,
          bookingId: squareBookingId || undefined,
          error: 'Booking created in Square but client record could not be saved locally',
        }
      }
      clientId = newClient.id
    }

    await supabase.from('appointments').insert({
      client_id: clientId,
      service_id: service.id,
      start_datetime: startAt,
      end_datetime: endAt,
      // Without Square sync we keep it pending so it appears in the admin
      // queue and Crystal can mirror it manually in Square if needed.
      status: squareSubscriptionBlocked ? 'pending' : 'confirmed',
      client_notes: data.notes || null,
      cancellation_token: uuidv4(),
      square_booking_id: squareBookingId,
      payment_method: 'pay_at_appointment',
      payment_status: 'unpaid',
    })

    // Log as a manually created booking event for analytics
    supabase.from('analytics_events').insert({
      event_type: 'booking_completed',
      source: 'admin',
      metadata: {
        service_id: service.id,
        service_name: service.name,
        price_cents: service.price_cents,
        admin_created: true,
      },
    }).then(({ error }) => {
      if (error) console.error('Failed to log admin booking event:', error)
    })

    invalidateAllSquareCache()

    if (squareSubscriptionBlocked) {
      return {
        ok: true,
        warning:
          'Saved on the website, but the booking was not created in Square. Square Appointments Plus or Premium is required to push bookings to Square. You will need to add this appointment manually in the Square dashboard.',
      }
    }

    return { ok: true, bookingId: squareBookingId || undefined }
  } catch (err: unknown) {
    console.error('createAdminAppointment failed:', err)
    if (isSquareSubscriptionError(err)) {
      return {
        ok: false,
        error:
          'Square Appointments Plus or Premium is required to create bookings via the API. Upgrade your Square subscription to enable website → Square sync.',
      }
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
