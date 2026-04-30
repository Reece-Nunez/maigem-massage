'use server'

import { z } from 'zod'
import { addMinutes, parseISO, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSquareServiceById } from '@/lib/square/services'
import { updateSquareBooking } from '@/lib/square/bookings'
import {
  findOrCreateSquareCustomer,
  updateSquareCustomer,
} from '@/lib/square/customers'
import { invalidateAllSquareCache } from '@/lib/square/admin'

const BUSINESS_TIMEZONE = 'America/Chicago'

const schema = z.object({
  appointmentId: z.string().min(1),
  service_id: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  notes: z.string().optional(),
  first_name: z.string().min(1, 'First name required'),
  last_name: z.string().min(1, 'Last name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(7, 'Phone required'),
  square_customer_id: z.string().optional(),
})

export interface UpdateAdminAppointmentResult {
  ok: boolean
  error?: string
}

export async function updateAdminAppointment(
  formData: FormData
): Promise<UpdateAdminAppointmentResult> {
  const parsed = schema.safeParse({
    appointmentId: formData.get('appointmentId'),
    service_id: formData.get('service_id'),
    date: formData.get('date'),
    time: formData.get('time'),
    notes: formData.get('notes') || '',
    first_name: formData.get('first_name'),
    last_name: formData.get('last_name'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    square_customer_id: formData.get('square_customer_id') || undefined,
  })

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid input' }
  }

  const data = parsed.data

  try {
    const service = await getSquareServiceById(data.service_id)
    if (!service) return { ok: false, error: 'Service not found' }
    if (!service.square_variation_id) {
      return { ok: false, error: 'Service is missing Square variation ID' }
    }

    // Compute the new UTC start datetime
    const [hours, minutes] = data.time.split(':').map(Number)
    const localDate = parseISO(data.date)
    const localDateTime = setMinutes(setHours(localDate, hours), minutes)
    const startAt = fromZonedTime(localDateTime, BUSINESS_TIMEZONE).toISOString()
    const endAt = addMinutes(new Date(startAt), service.duration_minutes).toISOString()

    const supabase = createAdminClient()

    // Locate the local row by either UUID id or square_booking_id
    const { data: bySupabaseId } = await supabase
      .from('appointments')
      .select('id, square_booking_id, status, client_id')
      .eq('id', data.appointmentId)
      .maybeSingle()

    const { data: bySquareId } = bySupabaseId
      ? { data: null }
      : await supabase
          .from('appointments')
          .select('id, square_booking_id, status, client_id')
          .eq('square_booking_id', data.appointmentId)
          .maybeSingle()

    const localRow = bySupabaseId || bySquareId
    const squareBookingId =
      localRow?.square_booking_id ||
      (!localRow ? data.appointmentId : null)

    // ----- Customer sync -----
    // Always ensure a Square customer exists with the latest details. If the
    // appointment came in with a known squareCustomerId, update it in place;
    // otherwise look up by email or create new.
    let squareCustomerId: string | null = data.square_customer_id || null
    if (squareCustomerId) {
      try {
        await updateSquareCustomer({
          squareCustomerId,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
        })
      } catch (err) {
        console.error('Failed to update Square customer, will fall back:', err)
        // Fall through to find-or-create as a safety net
        squareCustomerId = null
      }
    }
    if (!squareCustomerId) {
      try {
        squareCustomerId = await findOrCreateSquareCustomer({
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
        })
      } catch (err) {
        console.error('Failed to sync customer to Square:', err)
      }
    }

    // ----- Booking sync to Square -----
    if (squareBookingId) {
      await updateSquareBooking({
        bookingId: squareBookingId,
        startAt,
        durationMinutes: service.duration_minutes,
        squareServiceVariationId: service.square_variation_id,
        customerNote: data.notes || null,
      })
    }

    // ----- Mirror to Supabase -----
    if (localRow) {
      // Upsert service to satisfy the FK
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

      // Update the local client row attached to this appointment
      if (localRow.client_id) {
        await supabase
          .from('clients')
          .update({
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone: data.phone,
            square_customer_id: squareCustomerId,
          })
          .eq('id', localRow.client_id)
      }

      await supabase
        .from('appointments')
        .update({
          service_id: service.id,
          start_datetime: startAt,
          end_datetime: endAt,
          client_notes: data.notes || null,
        })
        .eq('id', localRow.id)
    } else if (squareCustomerId) {
      // No local mirror existed (Square-only booking). Create one now so
      // future edits can sync both sides cleanly.
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('email', data.email)
        .maybeSingle()

      let clientId = existingClient?.id || null
      if (!clientId) {
        const { data: newClient } = await supabase
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
        clientId = newClient?.id || null
      } else {
        await supabase
          .from('clients')
          .update({
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone,
            square_customer_id: squareCustomerId,
          })
          .eq('id', clientId)
      }

      if (clientId && squareBookingId) {
        await supabase.from('services').upsert({
          id: service.id,
          name: service.name,
          description: service.description,
          duration_minutes: service.duration_minutes,
          price_cents: service.price_cents,
          price_display: service.price_display,
          is_active: true,
          sort_order: service.sort_order,
        }, { onConflict: 'id' })

        await supabase.from('appointments').insert({
          client_id: clientId,
          service_id: service.id,
          start_datetime: startAt,
          end_datetime: endAt,
          status: 'confirmed',
          client_notes: data.notes || null,
          square_booking_id: squareBookingId,
          payment_method: 'pay_at_appointment',
          payment_status: 'unpaid',
        })
      }
    }

    invalidateAllSquareCache()
    return { ok: true }
  } catch (err: unknown) {
    console.error('updateAdminAppointment failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
