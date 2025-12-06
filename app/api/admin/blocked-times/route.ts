import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { parseISO, setHours, setMinutes } from 'date-fns'
import { fromZonedTime } from 'date-fns-tz'

const BUSINESS_TIMEZONE = 'America/Chicago'

const blockedTimeSchema = z.object({
  block_type: z.enum(['full-day', 'time-range']),
  start_date: z.string(),
  end_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated and is admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('auth_user_id')
      .eq('auth_user_id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validationResult = blockedTimeSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const { start_date, end_date, start_time, end_time, reason } = validationResult.data

    // Parse times
    const [startHour, startMinute] = start_time.split(':').map(Number)
    const [endHour, endMinute] = end_time.split(':').map(Number)

    // Create start datetime
    const localStartDate = parseISO(start_date)
    const localStartDateTime = setMinutes(setHours(localStartDate, startHour), startMinute)
    const startDatetime = fromZonedTime(localStartDateTime, BUSINESS_TIMEZONE)

    // Create end datetime
    const localEndDate = parseISO(end_date)
    const localEndDateTime = setMinutes(setHours(localEndDate, endHour), endMinute)
    const endDatetime = fromZonedTime(localEndDateTime, BUSINESS_TIMEZONE)

    const adminSupabase = createAdminClient()
    const { data: blockedTime, error } = await adminSupabase
      .from('blocked_times')
      .insert({
        start_datetime: startDatetime.toISOString(),
        end_datetime: endDatetime.toISOString(),
        reason: reason || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating blocked time:', error)
      return NextResponse.json({ error: 'Failed to create blocked time' }, { status: 500 })
    }

    return NextResponse.json({ success: true, blockedTime })
  } catch (error) {
    console.error('Error in admin blocked-times API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
