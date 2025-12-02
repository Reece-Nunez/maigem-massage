import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

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
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 })
    }

    const startDate = new Date(appointment.start_datetime)
    const endDate = new Date(appointment.end_datetime)

    // Format dates for ICS (YYYYMMDDTHHMMSSZ)
    const formatICSDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'")

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MaiGem Massage//Booking System//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
DTSTAMP:${formatICSDate(new Date())}
UID:${appointment.id}@maigemmassage.com
SUMMARY:${appointment.service.name} - MaiGem Massage
DESCRIPTION:Your ${appointment.service.name} appointment with Crystal Warren at MaiGem Massage.\\n\\nDuration: ${appointment.service.duration_minutes} minutes\\nPrice: ${appointment.service.price_display || 'Price Varies'}\\n\\nLocation: Om Yoga Wellness Building\\n205 E Chestnut Ave\\nPonca City\\, OK 74604\\n\\nPayment accepted: Cash\\, Card\\, Venmo (@lenaecrys)
LOCATION:Om Yoga Wellness Building\\, 205 E Chestnut Ave\\, Ponca City\\, OK 74604
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`

    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="maigem-massage-${format(startDate, 'yyyy-MM-dd')}.ics"`,
      },
    })
  } catch (error) {
    console.error('Error generating ICS:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
