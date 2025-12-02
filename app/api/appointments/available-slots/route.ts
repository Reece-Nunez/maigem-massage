import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseISO, startOfDay, endOfDay, addMinutes, format, isBefore, isAfter, setHours, setMinutes } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const BUSINESS_TIMEZONE = 'America/Chicago'
const SLOT_INTERVAL = 30 // minutes

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const serviceId = searchParams.get('service_id')

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: 'date and service_id are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get service duration
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Parse the date and get day of week
    const requestedDate = parseISO(dateStr)
    const zonedDate = toZonedTime(requestedDate, BUSINESS_TIMEZONE)
    const dayOfWeek = zonedDate.getDay()

    // Get availability for this day of week
    const { data: availability, error: availError } = await supabase
      .from('availability')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .single()

    if (availError || !availability) {
      // Day is not available
      return NextResponse.json({ date: dateStr, slots: [] })
    }

    // Get buffer time from settings
    const { data: bufferSetting } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'buffer_time_minutes')
      .single()

    const bufferMinutes = bufferSetting ? parseInt(bufferSetting.value as string) : 15

    // Get existing appointments for this day
    const dayStart = fromZonedTime(startOfDay(zonedDate), BUSINESS_TIMEZONE)
    const dayEnd = fromZonedTime(endOfDay(zonedDate), BUSINESS_TIMEZONE)

    const { data: appointments, error: apptError } = await supabase
      .from('appointments')
      .select('start_datetime, end_datetime')
      .gte('start_datetime', dayStart.toISOString())
      .lte('start_datetime', dayEnd.toISOString())
      .neq('status', 'cancelled')

    if (apptError) {
      console.error('Error fetching appointments:', apptError)
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
    }

    // Get blocked times for this day
    const { data: blockedTimes, error: blockedError } = await supabase
      .from('blocked_times')
      .select('start_datetime, end_datetime')
      .lte('start_datetime', dayEnd.toISOString())
      .gte('end_datetime', dayStart.toISOString())

    if (blockedError) {
      console.error('Error fetching blocked times:', blockedError)
    }

    // Generate time slots
    const [startHour, startMin] = availability.start_time.split(':').map(Number)
    const [endHour, endMin] = availability.end_time.split(':').map(Number)

    const slots: { time: string; available: boolean }[] = []
    let currentTime = setMinutes(setHours(zonedDate, startHour), startMin)
    const endTime = setMinutes(setHours(zonedDate, endHour), endMin)

    // Don't show slots in the past
    const now = toZonedTime(new Date(), BUSINESS_TIMEZONE)
    const minimumBookingTime = addMinutes(now, 60) // At least 1 hour from now

    while (isBefore(currentTime, endTime)) {
      const slotStart = fromZonedTime(currentTime, BUSINESS_TIMEZONE)
      const slotEnd = addMinutes(slotStart, service.duration_minutes + bufferMinutes)

      // Check if slot is in the past
      const isPast = isBefore(currentTime, minimumBookingTime)

      // Check if slot fits before end of day
      const fitsInDay = !isAfter(
        addMinutes(currentTime, service.duration_minutes),
        endTime
      )

      // Check for conflicts with existing appointments
      const hasConflict = (appointments || []).some((appt) => {
        const apptStart = new Date(appt.start_datetime)
        const apptEnd = new Date(appt.end_datetime)
        return (
          (slotStart >= apptStart && slotStart < apptEnd) ||
          (slotEnd > apptStart && slotEnd <= apptEnd) ||
          (slotStart <= apptStart && slotEnd >= apptEnd)
        )
      })

      // Check for conflicts with blocked times
      const isBlocked = (blockedTimes || []).some((block) => {
        const blockStart = new Date(block.start_datetime)
        const blockEnd = new Date(block.end_datetime)
        return (
          (slotStart >= blockStart && slotStart < blockEnd) ||
          (slotEnd > blockStart && slotEnd <= blockEnd) ||
          (slotStart <= blockStart && slotEnd >= blockEnd)
        )
      })

      slots.push({
        time: format(currentTime, 'HH:mm'),
        available: !isPast && fitsInDay && !hasConflict && !isBlocked
      })

      currentTime = addMinutes(currentTime, SLOT_INTERVAL)
    }

    return NextResponse.json({
      date: dateStr,
      slots
    })
  } catch (error) {
    console.error('Error in available-slots API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
