import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const availabilitySchema = z.object({
  availability: z.array(
    z.object({
      value: z.number().min(0).max(6),
      is_active: z.boolean(),
      start_time: z.string(),
      end_time: z.string(),
      id: z.string().optional(),
    })
  ),
})

export async function PUT(request: NextRequest) {
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
    const validationResult = availabilitySchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.flatten() },
        { status: 400 }
      )
    }

    const adminSupabase = createAdminClient()

    // Upsert all availability records
    for (const day of validationResult.data.availability) {
      const { error } = await adminSupabase
        .from('availability')
        .upsert(
          {
            day_of_week: day.value,
            is_active: day.is_active,
            start_time: day.start_time,
            end_time: day.end_time,
          },
          { onConflict: 'day_of_week' }
        )

      if (error) {
        console.error('Error updating availability:', error)
        return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in admin availability API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
