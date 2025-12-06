import { format } from 'date-fns'
import type { Appointment, Service, Client } from '@/types/database'

// Generate ICS file content for Apple Calendar
export function generateICS(
  appointment: Appointment,
  service: Service,
  client: Client
): string {
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
SUMMARY:${service.name} - MaiGem Massage
DESCRIPTION:Your ${service.name} appointment with Crystal Warren at MaiGem Massage.\\n\\nDuration: ${service.duration_minutes} minutes\\nPrice: ${service.price_display || 'Price Varies'}\\n\\nLocation: Om Yoga Wellness Building\\n205 E Chestnut Ave\\nPonca City, OK 74604\\n\\nPayment accepted: Cash, Card, Venmo (@lenaecrys)
LOCATION:Om Yoga Wellness Building, 205 E Chestnut Ave, Ponca City, OK 74604
STATUS:CONFIRMED
ORGANIZER;CN=MaiGem Massage:mailto:maigemmassage@example.com
ATTENDEE;CN=${client.first_name} ${client.last_name}:mailto:${client.email}
END:VEVENT
END:VCALENDAR`

  return icsContent
}

// Generate Google Calendar URL
export function generateGoogleCalendarURL(
  appointment: Appointment,
  service: Service
): string {
  const startDate = new Date(appointment.start_datetime)
  const endDate = new Date(appointment.end_datetime)

  // Format dates for Google Calendar (YYYYMMDDTHHMMSSZ)
  const formatGoogleDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'")

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${service.name} - MaiGem Massage`,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: `Your ${service.name} appointment with Crystal Warren at MaiGem Massage.\n\nDuration: ${service.duration_minutes} minutes\nPrice: ${service.price_display || 'Price Varies'}\n\nPayment accepted: Cash, Card, Venmo (@lenaecrys)`,
    location: 'Om Yoga Wellness Building, 205 E Chestnut Ave, Ponca City, OK 74604',
    ctz: 'America/Chicago'
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Generate Apple Calendar URL (opens Calendar app on Mac/iOS)
export function generateAppleCalendarURL(
  appointment: Appointment,
  service: Service
): string {
  const startDate = new Date(appointment.start_datetime)
  const endDate = new Date(appointment.end_datetime)

  // Format for webcal URL
  const formatICSDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'")

  // This would typically be a URL to download the ICS file
  // We'll handle this via the API route instead
  return `/api/calendar/ics/${appointment.id}`
}

// Format appointment details for email
export function formatAppointmentDetails(
  appointment: Appointment,
  service: Service,
  client: Client
): {
  subject: string
  date: string
  time: string
  duration: string
  price: string
  clientName: string
  serviceName: string
  location: string
} {
  const startDate = new Date(appointment.start_datetime)

  return {
    subject: `Appointment Confirmation - ${service.name}`,
    date: format(startDate, 'EEEE, MMMM d, yyyy'),
    time: format(startDate, 'h:mm a'),
    duration: `${service.duration_minutes} minutes`,
    price: service.price_display || 'Price Varies',
    clientName: `${client.first_name} ${client.last_name}`,
    serviceName: service.name,
    location: 'Om Yoga Wellness Building\n205 E Chestnut Ave\nPonca City, OK 74604'
  }
}
