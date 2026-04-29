import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import type { Json } from '@/types/database'

const eventSchema = z.object({
  event_type: z.enum([
    'phone_click',
    'email_click',
    'booking_started',
    'booking_completed',
    'directions_click',
    'contact_form_submit',
    'page_view',
  ]),
  source: z.string().max(50).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = eventSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Invalid event' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { event_type, source, metadata } = result.data

    await supabase.from('analytics_events').insert({
      event_type,
      source: source || null,
      metadata: (metadata || {}) as Json,
      user_agent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Event log error:', error)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
