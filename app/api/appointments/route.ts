import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { addMinutes, parseISO, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'
import { v4 as uuidv4 } from 'uuid'
import { sendRequestReceivedEmail, sendAdminNotificationEmail } from '@/lib/utils/email'
import { getSquareServiceById } from '@/lib/square/services'
import { findOrCreateSquareCustomer } from '@/lib/square/customers'
import { paymentsApi, SQUARE_LOCATION_ID } from '@/lib/square/client'

const BUSINESS_TIMEZONE = 'America/Chicago'

const bookingSchema = z.object({
  service_id: z.string().min(1),
  date: z.string(), // YYYY-MM-DD
  time: z.string(), // HH:mm
  client: z.object({
    first_name: z.string().min(1, 'First name is required'),
    last_name: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone number is required'),
  }),
  notes: z.string().optional(),
  payment_method: z.enum(['pay_at_appointment', 'pay_online']).default('pay_at_appointment'),
  payment_token: z.string().optional(),
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

    const { service_id, date, time, client: clientData, notes, payment_method, payment_token } = validationResult.data
    const supabase = createAdminClient()

    // Get service from Square
    const squareService = await getSquareServiceById(service_id)

    if (!squareService) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Upsert service into local table so FK relationship works
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .upsert({
        id: squareService.id,
        name: squareService.name,
        description: squareService.description,
        duration_minutes: squareService.duration_minutes,
        price_cents: squareService.price_cents,
        price_display: squareService.price_display,
        is_active: true,
        sort_order: squareService.sort_order,
      }, { onConflict: 'id' })
      .select('*')
      .single()

    if (serviceError || !service) {
      console.error('Error upserting service:', serviceError)
      return NextResponse.json({ error: 'Failed to sync service' }, { status: 500 })
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
      .select('id, square_customer_id')
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

    // Sync customer to Square (non-blocking)
    let squareCustomerId = existingClient?.square_customer_id || null
    if (!squareCustomerId) {
      try {
        squareCustomerId = await findOrCreateSquareCustomer({
          first_name: clientData.first_name,
          last_name: clientData.last_name,
          email: clientData.email,
          phone: clientData.phone,
        })
        await supabase
          .from('clients')
          .update({ square_customer_id: squareCustomerId })
          .eq('id', clientId)
      } catch (err) {
        console.error('Failed to sync customer to Square:', err)
      }
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

    // Create appointment with pending status
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
        status: 'pending',
        payment_method: payment_method,
        payment_status: 'unpaid',
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

    // Process online payment if chosen
    if (payment_method === 'pay_online' && payment_token && service.price_cents) {
      try {
        const paymentResponse = await paymentsApi.create({
          sourceId: payment_token,
          idempotencyKey: uuidv4(),
          amountMoney: {
            amount: BigInt(service.price_cents),
            currency: 'USD',
          },
          locationId: SQUARE_LOCATION_ID,
          customerId: squareCustomerId || undefined,
          referenceId: appointment.id,
        })

        const squarePaymentId = paymentResponse.payment?.id
        await supabase
          .from('appointments')
          .update({
            square_payment_id: squarePaymentId,
            payment_status: 'paid',
          })
          .eq('id', appointment.id)

        appointment.payment_status = 'paid'
        appointment.square_payment_id = squarePaymentId || null
      } catch (paymentError) {
        console.error('Payment failed:', paymentError)
        // Cancel the appointment since payment failed
        await supabase
          .from('appointments')
          .update({ status: 'cancelled', payment_status: 'failed' })
          .eq('id', appointment.id)

        return NextResponse.json(
          { error: 'Payment failed. Please try again.' },
          { status: 402 }
        )
      }
    }

    // Send emails (don't block on these)
    // 1. Send "request received" email to client
    sendRequestReceivedEmail({
      appointment: appointment,
      service: appointment.service,
      client: appointment.client,
    }).catch(err => console.error('Failed to send request received email:', err))

    // 2. Send notification email to admin (Crystal)
    sendAdminNotificationEmail({
      appointment: appointment,
      service: appointment.service,
      client: appointment.client,
    }).catch(err => console.error('Failed to send admin notification email:', err))

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        start_datetime: appointment.start_datetime,
        end_datetime: appointment.end_datetime,
        status: appointment.status,
        payment_status: appointment.payment_status,
        payment_method: appointment.payment_method,
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
