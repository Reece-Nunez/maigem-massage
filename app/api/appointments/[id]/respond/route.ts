import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/utils/email'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')
    const token = searchParams.get('token')

    if (!action || !token) {
      return new NextResponse(getErrorHtml('Missing action or token'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    if (action !== 'accept' && action !== 'reject') {
      return new NextResponse(getErrorHtml('Invalid action'), {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const supabase = createAdminClient()

    // Fetch the appointment and verify the token
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        service:services(*)
      `)
      .eq('id', id)
      .eq('cancellation_token', token)
      .single()

    if (error || !appointment) {
      return new NextResponse(getErrorHtml('Appointment not found or invalid token'), {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Check if already processed
    if (appointment.status !== 'pending') {
      return new NextResponse(
        getAlreadyProcessedHtml(appointment.status),
        {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        }
      )
    }

    // Update the appointment status
    const newStatus = action === 'accept' ? 'confirmed' : 'cancelled'
    const { error: updateError } = await supabase
      .from('appointments')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating appointment:', updateError)
      return new NextResponse(getErrorHtml('Failed to update appointment'), {
        status: 500,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Send appropriate email to client
    if (action === 'accept') {
      sendApprovalEmail({
        appointment: appointment,
        service: appointment.service,
        client: appointment.client,
      }).catch(err => console.error('Failed to send approval email:', err))
    } else {
      sendRejectionEmail({
        appointment: appointment,
        service: appointment.service,
        client: appointment.client,
      }).catch(err => console.error('Failed to send rejection email:', err))
    }

    // Return success HTML page
    return new NextResponse(
      getSuccessHtml(action, appointment.client, appointment.service),
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  } catch (error) {
    console.error('Error in respond API:', error)
    return new NextResponse(getErrorHtml('Internal server error'), {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

function getBaseHtml(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MaiGem Massage - Appointment Response</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #2d2d2d;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #faf9f7;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      text-align: center;
    }
    h1 {
      color: #7c9885;
      margin: 0 0 8px 0;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 16px;
    }
    .success { color: #28a745; }
    .error { color: #dc3545; }
    .warning { color: #ffc107; }
    .button {
      display: inline-block;
      background: #7c9885;
      color: white;
      padding: 12px 24px;
      border-radius: 50px;
      text-decoration: none;
      margin-top: 24px;
    }
    .button:hover {
      background: #5a7562;
    }
  </style>
</head>
<body>
  <div class="card">
    ${content}
  </div>
</body>
</html>
  `
}

function getSuccessHtml(action: string, client: { first_name: string; last_name: string }, service: { name: string }): string {
  const isAccept = action === 'accept'
  const content = `
    <div class="icon ${isAccept ? 'success' : 'error'}">${isAccept ? '✓' : '✗'}</div>
    <h1>MaiGem Massage</h1>
    <h2 style="color: #2d2d2d; margin: 0 0 16px 0;">
      Appointment ${isAccept ? 'Accepted' : 'Rejected'}
    </h2>
    <p style="color: #6b6b6b;">
      ${isAccept
        ? `You have accepted the appointment request from <strong>${client.first_name} ${client.last_name}</strong> for <strong>${service.name}</strong>. A confirmation email has been sent to the client.`
        : `You have declined the appointment request from <strong>${client.first_name} ${client.last_name}</strong> for <strong>${service.name}</strong>. The client has been notified.`
      }
    </p>
    <a href="/admin/appointments" class="button">View All Appointments</a>
  `
  return getBaseHtml(content)
}

function getAlreadyProcessedHtml(status: string): string {
  const content = `
    <div class="icon warning">⚠</div>
    <h1>MaiGem Massage</h1>
    <h2 style="color: #2d2d2d; margin: 0 0 16px 0;">Already Processed</h2>
    <p style="color: #6b6b6b;">
      This appointment has already been ${status}. No further action is needed.
    </p>
    <a href="/admin/appointments" class="button">View All Appointments</a>
  `
  return getBaseHtml(content)
}

function getErrorHtml(message: string): string {
  const content = `
    <div class="icon error">✗</div>
    <h1>MaiGem Massage</h1>
    <h2 style="color: #2d2d2d; margin: 0 0 16px 0;">Error</h2>
    <p style="color: #6b6b6b;">${message}</p>
    <a href="/admin/appointments" class="button">Go to Dashboard</a>
  `
  return getBaseHtml(content)
}
