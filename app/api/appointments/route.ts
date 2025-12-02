import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { addMinutes, parseISO, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { v4 as uuidv4 } from 'uuid'
import { sendConfirmationEmail } from '@/lib/utils/email'

const BUSINESS_TIMEZONE = 'America/Chicago'

const bookingSchema = z.object({
  service_id: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:mm
  client: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number is required'),
  }),
  notes: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = bookingSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { service_id, date, time, client: clientData, notes } = validationResult.data
    const supabase = createAdminClient()

    // Get service to calculate end time
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', service_id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Calculate start and end datetime
    const [hours, minutes] = time.split(':').map(Number)
    const localDate = parseISO(date)
    const localDateTime = setMinutes(setHours(localDate, hours), minutes)
    const startDatetime = fromZonedTime(localDateTime, BUSINESS_TIMEZONE)
    const endDatetime = addMinutes(startDatetime, service.duration_minutes)

    // Create or update client
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .eq('email', clientData.email)
      .single()

    let clientId: string

    if (existingClient) {
      // Update existing client
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          phone: clientData.phone,
        })
        .eq('id', existingClient.id)

      if (updateError) {
        console.error('Error updating client:', updateError)
        return NextResponse.json({ error: 'Failed to update client' }, { status: 500 })
      }

      clientId = existingClient.id
    } else {
      // Create new client
      const { data: newClient, error: createError } = await supabase
        .from('clients')
        .insert({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          email: clientData.email,
          phone: clientData.phone,
        })
        .select('id')
        .single()

      if (createError || !newClient) {
        console.error('Error creating client:', createError)
        return NextResponse.json({ error: 'Failed to create client' }, { status: 500 })
      }

      clientId = newClient.id
    }

    // Check for conflicting appointments one more time
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .neq('status', 'cancelled')
      .or(`and(start_datetime.lte.${endDatetime.toISOString()},end_datetime.gt.${startDatetime.toISOString()})`)

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    // Create appointment
    const cancellationToken = uuidv4()
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        client_id: clientId,
        service_id: service_id,
        start_datetime: startDatetime.toISOString(),
        end_datetime: endDatetime.toISOString(),
        client_notes: notes || null,
        cancellation_token: cancellationToken,
        status: 'confirmed',
      })
      .select(`
        *,
        client:clients(*),
        service:services(*)
      `)
      .single()

    if (appointmentError || !appointment) {
      console.error('Error creating appointment:', appointmentError)
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
    }

    // Send confirmation email (don't block on this)
    sendConfirmationEmail({
      appointment: appointment,
      service: appointment.service,
      client: appointment.client,
    }).catch(err => console.error('Failed to send confirmation email:', err))

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start_datetime: appointment.start_datetime,
        end_datetime: appointment.end_datetime,
        status: appointment.status,
        client: appointment.client,
        service: appointment.service,
        cancellation_token: cancellationToken,
      }
    })
  } catch (error) {
    console.error('Error in appointments API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
