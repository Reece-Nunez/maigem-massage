import { format, parseISO, addMinutes, setHours, setMinutes, startOfDay, isBefore, isAfter, isSameDay } from 'date-fns'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

export const BUSINESS_TIMEZONE = 'America/Chicago'

// Format a date for display in business timezone
export function formatDate(date: Date | string, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, BUSINESS_TIMEZONE, formatStr)
}

// Format time for display
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, BUSINESS_TIMEZONE, 'h:mm a')
}

// Format date and time together
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, BUSINESS_TIMEZONE, 'EEEE, MMMM d, yyyy \'at\' h:mm a')
}

// Format for display in booking confirmation
export function formatAppointmentDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, BUSINESS_TIMEZONE, 'EEEE, MMMM d, yyyy')
}

// Convert local time input to UTC for database storage
export function localToUTC(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number)
  const localDate = setMinutes(setHours(startOfDay(date), hours), minutes)
  return fromZonedTime(localDate, BUSINESS_TIMEZONE)
}

// Convert UTC date from database to local timezone
export function utcToLocal(date: Date | string): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  return toZonedTime(d, BUSINESS_TIMEZONE)
}

// Get day of week (0 = Sunday, 6 = Saturday)
export function getDayOfWeek(date: Date): number {
  return toZonedTime(date, BUSINESS_TIMEZONE).getDay()
}

// Generate time slots for a given day
export function generateTimeSlots(
  startTime: string, // "09:00"
  endTime: string,   // "17:00"
  intervalMinutes: number = 30
): string[] {
  const slots: string[] = []
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  let currentHour = startHour
  let currentMin = startMin

  while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
    slots.push(timeStr)

    currentMin += intervalMinutes
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60)
      currentMin = currentMin % 60
    }
  }

  return slots
}

// Format duration in minutes to human readable
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return hours === 1 ? '1 hr' : `${hours} hrs`
  }
  return `${hours} hr ${mins} min`
}

// Check if a slot can fit a service duration before end time
export function canFitService(
  slotTime: string,
  endTime: string,
  serviceDurationMinutes: number,
  bufferMinutes: number = 15
): boolean {
  const [slotHour, slotMin] = slotTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const slotMinutes = slotHour * 60 + slotMin
  const endMinutes = endHour * 60 + endMin
  const requiredMinutes = serviceDurationMinutes + bufferMinutes

  return slotMinutes + requiredMinutes <= endMinutes
}

// Check if two time ranges overlap
export function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return isBefore(start1, end2) && isAfter(end1, start2)
}

// Get dates for next N days
export function getNextDays(count: number, startDate: Date = new Date()): Date[] {
  const dates: Date[] = []
  let current = startOfDay(startDate)

  for (let i = 0; i < count; i++) {
    dates.push(current)
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
  }

  return dates
}
