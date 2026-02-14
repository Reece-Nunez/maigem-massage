import { Resend } from 'resend'
import { format } from 'date-fns'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Appointment, Service, Client } from '@/types/database'

const resend = new Resend(process.env.RESEND_API_KEY)

// Fallback email if database lookup fails
const FALLBACK_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'crystalwarren67@yahoo.com'

// Fetch the business email from admin_settings
async function getAdminEmail(): Promise<string> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'business_email')
      .single()

    if (error || !data) {
      console.warn('Could not fetch business_email from settings, using fallback:', FALLBACK_ADMIN_EMAIL)
      return FALLBACK_ADMIN_EMAIL
    }

    // The value is stored as JSON string like "\"email@example.com\""
    let email = data.value as string
    // Remove surrounding quotes if present
    if (typeof email === 'string' && email.startsWith('"') && email.endsWith('"')) {
      email = email.slice(1, -1)
    }

    return email || FALLBACK_ADMIN_EMAIL
  } catch (error) {
    console.error('Error fetching admin email:', error)
    return FALLBACK_ADMIN_EMAIL
  }
}

interface EmailParams {
  appointment: Appointment
  service: Service
  client: Client
}

// Base email template styles
const baseStyles = {
  body: 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #2d2d2d; max-width: 600px; margin: 0 auto; padding: 20px;',
  header: 'text-align: center; margin-bottom: 30px;',
  title: 'color: #7c9885; margin: 0;',
  subtitle: 'color: #6b6b6b; margin: 5px 0;',
  card: 'background: #faf9f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;',
  cardTitle: 'margin: 0 0 16px 0; color: #2d2d2d;',
  table: 'width: 100%; border-collapse: collapse;',
  label: 'padding: 8px 0; color: #6b6b6b;',
  value: 'padding: 8px 0; text-align: right; font-weight: 500;',
  button: 'display: inline-block; padding: 14px 28px; border-radius: 50px; text-decoration: none; margin: 8px; font-weight: 500;',
  primaryButton: 'background: #7c9885; color: white;',
  secondaryButton: 'background: #d4c5b5; color: #2d2d2d;',
  dangerButton: 'background: #dc3545; color: white;',
  footer: 'text-align: center; color: #6b6b6b; font-size: 14px;',
}

function getAppointmentDetailsHtml(service: Service, startDate: Date): string {
  return `
    <div style="${baseStyles.card}">
      <h2 style="${baseStyles.cardTitle}">Appointment Details</h2>
      <table style="${baseStyles.table}">
        <tr>
          <td style="${baseStyles.label}">Service</td>
          <td style="${baseStyles.value}">${service.name}</td>
        </tr>
        <tr>
          <td style="${baseStyles.label}">Date</td>
          <td style="${baseStyles.value}">${format(startDate, 'EEEE, MMMM d, yyyy')}</td>
        </tr>
        <tr>
          <td style="${baseStyles.label}">Time</td>
          <td style="${baseStyles.value}">${format(startDate, 'h:mm a')}</td>
        </tr>
        <tr>
          <td style="${baseStyles.label}">Duration</td>
          <td style="${baseStyles.value}">${service.duration_minutes} minutes</td>
        </tr>
        <tr>
          <td style="${baseStyles.label}">Price</td>
          <td style="${baseStyles.value}; color: #7c9885;">${service.price_display || 'Price Varies'}</td>
        </tr>
      </table>
    </div>
  `
}

function getClientDetailsHtml(client: Client): string {
  return `
    <div style="${baseStyles.card}">
      <h2 style="${baseStyles.cardTitle}">Client Information</h2>
      <table style="${baseStyles.table}">
        <tr>
          <td style="${baseStyles.label}">Name</td>
          <td style="${baseStyles.value}">${client.first_name} ${client.last_name}</td>
        </tr>
        <tr>
          <td style="${baseStyles.label}">Email</td>
          <td style="${baseStyles.value}">${client.email}</td>
        </tr>
        <tr>
          <td style="${baseStyles.label}">Phone</td>
          <td style="${baseStyles.value}">${client.phone}</td>
        </tr>
      </table>
    </div>
  `
}

function getLocationHtml(): string {
  return `
    <div style="${baseStyles.card}">
      <h2 style="${baseStyles.cardTitle}">Location</h2>
      <p style="margin: 0; font-weight: 500;">Om Yoga Wellness Building</p>
      <p style="margin: 4px 0; color: #6b6b6b;">205 E Chestnut Ave</p>
      <p style="margin: 4px 0; color: #6b6b6b;">Ponca City, OK 74604</p>
      <a href="https://maps.google.com/?q=205+E+Chestnut+Ave,+Ponca+City,+OK+74604"
         style="display: inline-block; margin-top: 12px; color: #7c9885; text-decoration: none;">
        Get Directions →
      </a>
    </div>
  `
}

function getPaymentHtml(appointment?: Appointment): string {
  if (appointment?.payment_status === 'paid') {
    return `
    <div style="background: #d4edda; color: #155724; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 12px 0; color: #155724;">Payment Received</h2>
      <p style="margin: 0;">Your payment has been processed successfully via card. No further payment is needed at your appointment.</p>
    </div>
    `
  }

  return `
    <div style="background: #7c9885; color: white; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 12px 0; color: white;">Payment Information</h2>
      <p style="margin: 0; opacity: 0.9;">Payment is collected at your appointment. We accept:</p>
      <ul style="margin: 12px 0; padding-left: 20px; opacity: 0.9;">
        <li>Cash</li>
        <li>Credit/Debit Card (Apple Pay, Google Pay, Samsung Pay)</li>
        <li>Venmo: @lenaecrys</li>
      </ul>
    </div>
  `
}

function getFooterHtml(): string {
  return `
    <div style="${baseStyles.footer}">
      <p>Questions? Contact us:</p>
      <p>
        <a href="tel:+15803049861" style="color: #7c9885; text-decoration: none;">(580) 304-9861</a>
      </p>
      <p style="margin-top: 24px;">
        Thank you for choosing MaiGem Massage!<br>
        <em>- Crystal Warren</em>
      </p>
    </div>
  `
}

// 1. Email sent to CLIENT when they submit a booking request
export async function sendRequestReceivedEmail({
  appointment,
  service,
  client,
}: EmailParams) {
  const startDate = new Date(appointment.start_datetime)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Request Received</title>
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.header}">
    <h1 style="${baseStyles.title}">MaiGem Massage</h1>
    <p style="${baseStyles.subtitle}">Your booking request has been received!</p>
  </div>

  <div style="${baseStyles.card}">
    <p style="margin: 0; color: #2d2d2d;">
      Hi ${client.first_name},
    </p>
    <p style="margin: 16px 0; color: #6b6b6b;">
      Thank you for requesting an appointment with MaiGem Massage. Your request is being reviewed and you will receive a confirmation email once it has been approved.
    </p>
    <p style="margin: 0; padding: 12px; background: #fff3cd; border-radius: 8px; color: #856404;">
      <strong>Status:</strong> Pending Approval
    </p>
  </div>

  ${getAppointmentDetailsHtml(service, startDate)}
  ${getLocationHtml()}
  ${getFooterHtml()}
</body>
</html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MaiGem Massage <onboarding@resend.dev>',
      to: client.email,
      subject: `Booking Request Received - ${service.name} on ${format(startDate, 'MMM d')}`,
      html,
    })

    if (error) {
      console.error('Error sending request received email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending request received email:', error)
    return { success: false, error }
  }
}

// 2. Email sent to ADMIN (Crystal) when a new booking request comes in
export async function sendAdminNotificationEmail({
  appointment,
  service,
  client,
}: EmailParams) {
  const startDate = new Date(appointment.start_datetime)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const acceptUrl = `${siteUrl}/api/appointments/${appointment.id}/respond?action=accept&token=${appointment.cancellation_token}`
  const rejectUrl = `${siteUrl}/api/appointments/${appointment.id}/respond?action=reject&token=${appointment.cancellation_token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Request</title>
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.header}">
    <h1 style="${baseStyles.title}">MaiGem Massage</h1>
    <p style="${baseStyles.subtitle}">New Booking Request!</p>
  </div>

  <div style="${baseStyles.card}">
    <p style="margin: 0; color: #2d2d2d; font-size: 18px;">
      You have a new appointment request from <strong>${client.first_name} ${client.last_name}</strong>
    </p>
  </div>

  ${getClientDetailsHtml(client)}
  ${getAppointmentDetailsHtml(service, startDate)}

  ${appointment.client_notes ? `
  <div style="${baseStyles.card}">
    <h2 style="${baseStyles.cardTitle}">Client Notes</h2>
    <p style="margin: 0; color: #6b6b6b;">${appointment.client_notes}</p>
  </div>
  ` : ''}

  <div style="text-align: center; margin: 32px 0;">
    <p style="color: #6b6b6b; margin-bottom: 16px;">Respond to this request:</p>
    <a href="${acceptUrl}"
       style="${baseStyles.button} ${baseStyles.primaryButton}">
      ✓ Accept Appointment
    </a>
    <a href="${rejectUrl}"
       style="${baseStyles.button} ${baseStyles.dangerButton}">
      ✗ Reject Appointment
    </a>
  </div>

  <div style="${baseStyles.card}">
    <p style="margin: 0; color: #6b6b6b; font-size: 14px;">
      You can also manage this appointment from your <a href="${siteUrl}/admin/appointments" style="color: #7c9885;">admin dashboard</a>.
    </p>
  </div>
</body>
</html>
  `

  try {
    const adminEmail = await getAdminEmail()

    const { data, error } = await resend.emails.send({
      from: 'MaiGem Massage <onboarding@resend.dev>',
      to: adminEmail,
      subject: `New Booking Request - ${client.first_name} ${client.last_name} - ${format(startDate, 'MMM d, h:mm a')}`,
      html,
    })

    if (error) {
      console.error('Error sending admin notification email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending admin notification email:', error)
    return { success: false, error }
  }
}

// 3. Email sent to CLIENT when appointment is ACCEPTED
export async function sendApprovalEmail({
  appointment,
  service,
  client,
}: EmailParams) {
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
  <title>Appointment Confirmed</title>
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.header}">
    <h1 style="${baseStyles.title}">MaiGem Massage</h1>
    <p style="${baseStyles.subtitle}">Your appointment is confirmed!</p>
  </div>

  <div style="${baseStyles.card}">
    <p style="margin: 0; color: #2d2d2d;">
      Hi ${client.first_name},
    </p>
    <p style="margin: 16px 0; color: #6b6b6b;">
      Great news! Your appointment request has been approved. We look forward to seeing you!
    </p>
    <p style="margin: 0; padding: 12px; background: #d4edda; border-radius: 8px; color: #155724;">
      <strong>Status:</strong> Confirmed ✓
    </p>
  </div>

  ${getAppointmentDetailsHtml(service, startDate)}
  ${getLocationHtml()}

  <div style="text-align: center; margin-bottom: 24px;">
    <p style="color: #6b6b6b; margin-bottom: 16px;">Add to your calendar:</p>
    <a href="${googleCalendarUrl}"
       style="${baseStyles.button} ${baseStyles.primaryButton}">
      Google Calendar
    </a>
    <a href="${icsUrl}"
       style="${baseStyles.button} ${baseStyles.secondaryButton}">
      Apple Calendar
    </a>
  </div>

  ${getPaymentHtml(appointment)}
  ${getFooterHtml()}
</body>
</html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MaiGem Massage <onboarding@resend.dev>',
      to: client.email,
      subject: `Appointment Confirmed! - ${service.name} on ${format(startDate, 'MMM d')}`,
      html,
    })

    if (error) {
      console.error('Error sending approval email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending approval email:', error)
    return { success: false, error }
  }
}

// 4. Email sent to CLIENT when appointment is REJECTED
export async function sendRejectionEmail({
  appointment,
  service,
  client,
}: EmailParams) {
  const startDate = new Date(appointment.start_datetime)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Request Update</title>
</head>
<body style="${baseStyles.body}">
  <div style="${baseStyles.header}">
    <h1 style="${baseStyles.title}">MaiGem Massage</h1>
    <p style="${baseStyles.subtitle}">Appointment Request Update</p>
  </div>

  <div style="${baseStyles.card}">
    <p style="margin: 0; color: #2d2d2d;">
      Hi ${client.first_name},
    </p>
    <p style="margin: 16px 0; color: #6b6b6b;">
      Unfortunately, we are unable to accommodate your appointment request for the requested time. This could be due to scheduling conflicts or availability changes.
    </p>
    <p style="margin: 0; padding: 12px; background: #f8d7da; border-radius: 8px; color: #721c24;">
      <strong>Status:</strong> Unable to Accommodate
    </p>
  </div>

  ${getAppointmentDetailsHtml(service, startDate)}

  <div style="text-align: center; margin: 32px 0;">
    <p style="color: #6b6b6b; margin-bottom: 16px;">We'd love to find a time that works for you!</p>
    <a href="${siteUrl}/book"
       style="${baseStyles.button} ${baseStyles.primaryButton}">
      Book Another Time
    </a>
  </div>

  <div style="${baseStyles.card}">
    <p style="margin: 0; color: #6b6b6b;">
      If you have questions or would like to discuss alternative times, please don't hesitate to reach out.
    </p>
  </div>

  ${getFooterHtml()}
</body>
</html>
  `

  try {
    const { data, error } = await resend.emails.send({
      from: 'MaiGem Massage <onboarding@resend.dev>',
      to: client.email,
      subject: `Appointment Request Update - ${service.name}`,
      html,
    })

    if (error) {
      console.error('Error sending rejection email:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (error) {
    console.error('Error sending rejection email:', error)
    return { success: false, error }
  }
}

// Keep the old function for backwards compatibility (can be removed later)
export async function sendConfirmationEmail(params: EmailParams) {
  return sendApprovalEmail(params)
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
