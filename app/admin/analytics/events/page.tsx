import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { format, subDays, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const BUSINESS_TIMEZONE = 'America/Chicago'

const EVENT_LABELS: Record<string, string> = {
  phone_click: 'Phone Calls',
  email_click: 'Email Clicks',
  booking_started: 'Booking Started',
  booking_completed: 'Bookings Completed',
  directions_click: 'Directions',
  contact_form_submit: 'Contact Form',
}

const VALID_TYPES = Object.keys(EVENT_LABELS)
const RANGES: Record<string, { days: number | null; label: string }> = {
  '7': { days: 7, label: 'Last 7 days' },
  '30': { days: 30, label: 'Last 30 days' },
  '90': { days: 90, label: 'Last 90 days' },
  'all': { days: null, label: 'All time' },
}

type EventDetail = {
  id: string
  event_type: string
  source: string | null
  metadata: Record<string, unknown> | null
  user_agent: string | null
  referrer: string | null
  created_at: string
}

export const dynamic = 'force-dynamic'

export default async function EventDrillDownPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; range?: string }>
}) {
  const { type, range = '30' } = await searchParams

  if (!type || !VALID_TYPES.includes(type)) {
    notFound()
  }

  const rangeConfig = RANGES[range] || RANGES['30']
  const supabase = createAdminClient()

  let query = supabase
    .from('analytics_events')
    .select('*')
    .eq('event_type', type)
    .order('created_at', { ascending: false })
    .limit(500)

  if (rangeConfig.days !== null) {
    const since = startOfDay(subDays(new Date(), rangeConfig.days)).toISOString()
    query = query.gte('created_at', since)
  }

  const { data } = await query
  const events = (data as EventDetail[]) || []

  return (
    <div>
      <Link
        href="/admin/analytics"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-4"
      >
        ← Back to Analytics
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
        {EVENT_LABELS[type]}
      </h1>
      <p className="text-text-muted text-sm mb-6">
        {events.length} event{events.length === 1 ? '' : 's'} · {rangeConfig.label}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(RANGES).map(([key, cfg]) => (
          <Link
            key={key}
            href={`/admin/analytics/events?type=${type}&range=${key}`}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              range === key
                ? 'bg-primary text-white'
                : 'bg-secondary/30 text-foreground hover:bg-secondary/50'
            }`}
          >
            {cfg.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-muted text-sm">
            No {EVENT_LABELS[type].toLowerCase()} in this period yet.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/20 border-b border-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-foreground">When</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Source</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden md:table-cell">
                    Details
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden lg:table-cell">
                    Referrer
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const zoned = toZonedTime(new Date(e.created_at), BUSINESS_TIMEZONE)
                  const meta = e.metadata && typeof e.metadata === 'object' ? e.metadata : null
                  return (
                    <tr
                      key={e.id}
                      className="border-b border-secondary/20 last:border-0 hover:bg-secondary/10"
                    >
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        {format(zoned, 'MMM d, yyyy')}
                        <span className="text-text-muted ml-2">
                          {format(zoned, 'h:mm a')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {e.source || '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        {meta && Object.keys(meta).length > 0
                          ? Object.entries(meta)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(' · ')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden lg:table-cell max-w-xs truncate">
                        {e.referrer || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {events.length === 500 && (
            <div className="p-3 text-center text-xs text-text-muted bg-secondary/10">
              Showing first 500 events. Narrow the date range to see more recent only.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
