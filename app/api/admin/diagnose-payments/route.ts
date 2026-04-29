import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentsApi, SQUARE_LOCATION_ID } from '@/lib/square/client'

// Diagnostic endpoint — call directly in the browser as admin to see why
// payments aren't loading. Returns Square environment, configured location,
// available locations, and a sample of payments fetched without filters.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('auth_user_id')
      .eq('auth_user_id', user.id)
      .single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const result: Record<string, unknown> = {
      env: {
        SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT || '(unset, defaults to sandbox)',
        SQUARE_LOCATION_ID,
        hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
      },
    }

    // Test 1: list payments WITHOUT a locationId filter — uses default main location
    const noLocationPayments: unknown[] = []
    try {
      let count = 0
      for await (const p of await paymentsApi.list({ limit: 100 })) {
        if (count < 5) {
          noLocationPayments.push({
            id: p.id,
            status: p.status,
            createdAt: p.createdAt,
            locationId: p.locationId,
            amount: p.totalMoney?.amount?.toString(),
            customerId: p.customerId,
          })
        }
        count += 1
        if (count >= 100) break // safety stop after one page
      }
      result.noLocationFilter = {
        sample: noLocationPayments,
        countOnFirstPage: count,
      }
    } catch (err: unknown) {
      result.noLocationFilter = {
        error: err instanceof Error ? err.message : String(err),
      }
    }

    // Test 2: list payments WITH the configured locationId
    const withLocationPayments: unknown[] = []
    try {
      let count = 0
      for await (const p of await paymentsApi.list({
        locationId: SQUARE_LOCATION_ID,
        limit: 100,
      })) {
        if (count < 5) {
          withLocationPayments.push({
            id: p.id,
            status: p.status,
            createdAt: p.createdAt,
            locationId: p.locationId,
            amount: p.totalMoney?.amount?.toString(),
          })
        }
        count += 1
        if (count >= 100) break
      }
      result.withConfiguredLocation = {
        sample: withLocationPayments,
        countOnFirstPage: count,
      }
    } catch (err: unknown) {
      result.withConfiguredLocation = {
        error: err instanceof Error ? err.message : String(err),
      }
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
