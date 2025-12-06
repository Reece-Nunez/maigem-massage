import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        service:services(*)
      `)
      .eq('id', id)
      .single()

    if (error || !appointment) {
      console.error('Error fetching appointment:', error)
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    // Don't expose sensitive data to public
    return NextResponse.json({
      id: appointment.id,
      start_datetime: appointment.start_datetime,
      end_datetime: appointment.end_datetime,
      status: appointment.status,
      service: appointment.service,
      client: {
        first_name: appointment.client.first_name,
        email: appointment.client.email,
      },
    })
  } catch (error) {
    console.error('Error fetching appointment:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
