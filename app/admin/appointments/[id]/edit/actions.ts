'use server'

import { z } from 'zod'
import { addMinutes, parseISO, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSquareServiceById } from '@/lib/square/services'
import { updateSquareBooking } from '@/lib/square/bookings'
import { invalidateAllSquareCache } from '@/lib/square/admin'

const BUSINESS_TIMEZONE = 'America/Chicago'

const schema = z.object({
  appointmentId: z.string().min(1),
  service_id: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  notes: z.string().optional(),
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
      .select('id, square_booking_id, status')
      .eq('id', data.appointmentId)
      .maybeSingle()

    const { data: bySquareId } = bySupabaseId
      ? { data: null }
      : await supabase
          .from('appointments')
          .select('id, square_booking_id, status')
          .eq('square_booking_id', data.appointmentId)
          .maybeSingle()

    const localRow = bySupabaseId || bySquareId
    const squareBookingId =
      localRow?.square_booking_id ||
      // If no local row, the appointmentId itself is the Square booking ID
      (!localRow ? data.appointmentId : null)

    // Sync to Square if we have a Square booking to update.
    // (Pending Supabase rows haven't synced yet — those just update locally.)
    if (squareBookingId) {
      await updateSquareBooking({
        bookingId: squareBookingId,
        startAt,
        durationMinutes: service.duration_minutes,
        squareServiceVariationId: service.square_variation_id,
        customerNote: data.notes || null,
      })
    }

    // Mirror to Supabase if a local row exists
    if (localRow) {
      // Upsert service first to satisfy the FK
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

      await supabase
        .from('appointments')
        .update({
          service_id: service.id,
          start_datetime: startAt,
          end_datetime: endAt,
          client_notes: data.notes || null,
        })
        .eq('id', localRow.id)
    }

    invalidateAllSquareCache()
    return { ok: true }
  } catch (err: unknown) {
    console.error('updateAdminAppointment failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}
