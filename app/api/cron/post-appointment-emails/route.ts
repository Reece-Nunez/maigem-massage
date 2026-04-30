import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendThankYouEmail } from '@/lib/utils/email'
import type { Appointment, Client, Service } from '@/types/database'

// Vercel cron runs this hourly. It scans for appointments that:
//   - ended between 2 and 24 hours ago (gives the client time to leave,
//     before they forget their visit)
//   - are confirmed (we don't email cancelled or no-show clients)
//   - have not already received the post-appointment email
// For each match it sends a thank-you / review-request email and flips the
// post_appointment_email_sent flag so we don't double-send.

type AppointmentWithRelations = Appointment & {
  client: Client | null
  service: Service | null
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret. Vercel automatically attaches
  // Authorization: Bearer ${CRON_SECRET} when it invokes scheduled jobs.
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`
  if (process.env.CRON_SECRET && authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  const twentyFourHoursAgo = new Date(
    now.getTime() - 24 * 60 * 60 * 1000
  ).toISOString()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      client:clients(*),
      service:services(*)
    `)
    .eq('post_appointment_email_sent', false)
    .eq('status', 'confirmed')
    .gte('end_datetime', twentyFourHoursAgo)
    .lte('end_datetime', twoHoursAgo)
    .limit(50)

  if (error) {
    console.error('[cron/post-appointment-emails] Query error:', error)
    return NextResponse.json(
      { error: 'Failed to load appointments' },
      { status: 500 }
    )
  }

  const appointments = (data as unknown as AppointmentWithRelations[]) || []

  let sent = 0
  let failed = 0

  for (const appt of appointments) {
    if (!appt.client || !appt.service) {
      console.warn(
        `[cron/post-appointment-emails] Skipping ${appt.id} — missing client or service`
      )
      continue
    }

    const result = await sendThankYouEmail({
      appointment: appt,
      service: appt.service,
      client: appt.client,
    })

    if (result.success) {
      sent += 1
      await supabase
        .from('appointments')
        .update({ post_appointment_email_sent: true })
        .eq('id', appt.id)
    } else {
      failed += 1
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: appointments.length,
    sent,
    failed,
  })
}
