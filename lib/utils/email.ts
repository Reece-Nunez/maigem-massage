import { Resend } from 'resend'
import { format } from 'date-fns'
import type { Appointment, Service, Client } from '@/types/database'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendConfirmationEmailParams {
  appointment: Appointment
  service: Service
  client: Client
}

export async function sendConfirmationEmail({
  appointment,
  service,
  client,
}: SendConfirmationEmailParams) {
  const startDate = new Date(appointment.start_datetime)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const googleCalendarUrl = generateGoogleCalendarUrl(appointment, service)
  const icsUrl = `${siteUrl}/api/calendar/ics/${appointment.id}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Confirmation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d2d2d; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #7c9885; margin: 0;">MaiGem Massage</h1>
    <p style="color: #6b6b6b; margin: 5px 0;">Your appointment is confirmed!</p>
  </div>

  <div style="background: #faf9f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 16px 0; color: #2d2d2d;">Appointment Details</h2>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6b6b6b;">Service</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${service.name}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b6b6b;">Date</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${format(startDate, 'EEEE, MMMM d, yyyy')}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b6b6b;">Time</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${format(startDate, 'h:mm a')}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b6b6b;">Duration</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500;">${service.duration_minutes} minutes</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6b6b6b;">Price</td>
        <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #7c9885;">${service.price_display || 'Price Varies'}</td>
      </tr>
    </table>
  </div>

  <div style="background: #faf9f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 16px 0; color: #2d2d2d;">Location</h2>
    <p style="margin: 0; font-weight: 500;">Om Yoga Wellness Building</p>
    <p style="margin: 4px 0; color: #6b6b6b;">205 E Chestnut Ave</p>
    <p style="margin: 4px 0; color: #6b6b6b;">Ponca City, OK 74604</p>
    <a href="https://maps.google.com/?q=205+E+Chestnut+Ave,+Ponca+City,+OK+74604"
       style="display: inline-block; margin-top: 12px; color: #7c9885; text-decoration: none;">
      Get Directions →
    </a>
  </div>

  <div style="text-align: center; margin-bottom: 24px;">
    <p style="color: #6b6b6b; margin-bottom: 16px;">Add to your calendar:</p>
    <a href="${googleCalendarUrl}"
       style="display: inline-block; background: #7c9885; color: white; padding: 12px 24px; border-radius: 50px; text-decoration: none; margin: 4px;">
      Google Calendar
    </a>
    <a href="${icsUrl}"
       style="display: inline-block; background: #d4c5b5; color: #2d2d2d; padding: 12px 24px; border-radius: 50px; text-decoration: none; margin: 4px;">
      Apple Calendar
    </a>
  </div>

  <div style="background: #7c9885; color: white; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    <h2 style="margin: 0 0 12px 0; color: white;">Payment Information</h2>
    <p style="margin: 0; opacity: 0.9;">Payment is collected at your appointment. We accept:</p>
    <ul style="margin: 12px 0; padding-left: 20px; opacity: 0.9;">
      <li>Cash</li>
      <li>Credit/Debit Card (Apple Pay, Google Pay, Samsung Pay)</li>
      <li>Venmo: @lenaecrys</li>
    </ul>
  </div>

  <div style="text-align: center; color: #6b6b6b; font-size: 14px;">
    <p>Questions? Contact us:</p>
    <p>
      <a href="tel:+15803049861" style="color: #7c9885; text-decoration: none;">(580) 304-9861</a>
    </p>
    <p style="margin-top: 24px;">
      Thank you for choosing MaiGem Massage!<br>
      <em>- Crystal Warren</em>
    </p>
  </div>
</body>
</html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MaiGem Massage <onboarding@resend.dev>',
      to: client.email,
      subject: `Appointment Confirmed - ${service.name} on ${format(startDate, 'MMM d')}`,
      html,
    })

    if (error) {
      console.error('Error sending email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending email:', error)
    return { success: false, error }
  }
}

function generateGoogleCalendarUrl(appointment: Appointment, service: Service): string {
  const startDate = new Date(appointment.start_datetime)
  const endDate = new Date(appointment.end_datetime)

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
