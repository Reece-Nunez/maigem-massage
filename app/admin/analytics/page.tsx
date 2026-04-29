import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { format, subDays, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'

const BUSINESS_TIMEZONE = 'America/Chicago'

type EventRow = {
  event_type: string
  source: string | null
  created_at: string
}

const EVENT_LABELS: Record<string, string> = {
  phone_click: 'Phone Calls',
  email_click: 'Email Clicks',
  booking_started: 'Booking Started',
  booking_completed: 'Bookings Completed',
  directions_click: 'Directions',
  contact_form_submit: 'Contact Form',
}

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
  const supabase = createAdminClient()
  const now = new Date()
  const since30 = startOfDay(subDays(now, 30)).toISOString()
  const since7 = startOfDay(subDays(now, 7)).toISOString()
  const since90 = startOfDay(subDays(now, 90)).toISOString()
  const since12mo = startOfMonth(subMonths(now, 11)).toISOString()

  const [
    { data: events30 },
    { count: clientsAll },
    { count: clients30 },
    { count: clients90 },
    { count: bookingsAll },
    { count: bookings30 },
    { count: bookings90 },
    { data: bookingsByMonth },
    { data: pageViews30Data },
  ] = await Promise.all([
    supabase
      .from('analytics_events')
      .select('event_type, source, created_at')
      .gte('created_at', since30)
      .order('created_at', { ascending: false }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since30),
    supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since90),
    supabase.from('appointments').select('*', { count: 'exact', head: true }),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since30),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since90),
    supabase
      .from('appointments')
      .select('created_at')
      .gte('created_at', since12mo),
    supabase
      .from('analytics_events')
      .select('source, created_at')
      .eq('event_type', 'page_view')
      .gte('created_at', since30),
  ])

  const events: EventRow[] = (events30 as EventRow[]) || []
  const events7 = events.filter(e => e.created_at >= since7)

  // Aggregate bookings into per-month buckets for the last 12 months
  const monthBuckets: { label: string; key: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    monthBuckets.push({
      label: format(d, 'MMM'),
      key: format(d, 'yyyy-MM'),
      count: 0,
    })
  }
  for (const row of (bookingsByMonth as { created_at: string }[]) || []) {
    const zoned = toZonedTime(new Date(row.created_at), BUSINESS_TIMEZONE)
    const key = format(zoned, 'yyyy-MM')
    const bucket = monthBuckets.find(b => b.key === key)
    if (bucket) bucket.count += 1
  }
  const maxMonth = Math.max(1, ...monthBuckets.map(b => b.count))

  // Page view aggregation (30d)
  const pageViews = (pageViews30Data as { source: string | null; created_at: string }[]) || []
  const pageViews7 = pageViews.filter((p) => p.created_at >= since7).length
  const pageViewsByPath = pageViews.reduce<Record<string, number>>((acc, p) => {
    const path = p.source || '/'
    acc[path] = (acc[path] || 0) + 1
    return acc
  }, {})
  const topPages = Object.entries(pageViewsByPath)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const maxPageViews = Math.max(1, ...topPages.map(([, c]) => c))

  const countByType = (rows: EventRow[]) =>
    rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.event_type] = (acc[r.event_type] || 0) + 1
      return acc
    }, {})

  const totals30 = countByType(events)
  const totals7 = countByType(events7)

  const types = Object.keys(EVENT_LABELS)
  const recent = events.slice(0, 25)

  const bookingStarted30 = totals30.booking_started || 0
  const bookingCompleted30 = totals30.booking_completed || 0
  const conversionRate =
    bookingStarted30 > 0
      ? ((bookingCompleted30 / bookingStarted30) * 100).toFixed(1)
      : '—'

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Analytics</h1>
      <p className="text-text-muted text-sm mb-6 sm:mb-8">
        Customer engagement & conversions from the website
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-6 col-span-2 lg:col-span-3 bg-primary/5 border-primary/30">
          <p className="text-text-muted text-xs sm:text-sm">Page Views</p>
          <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-primary">
            {pageViews.length}
          </p>
          <p className="text-xs text-text-muted mt-1">
            {pageViews7} in last 7 days · across {Object.keys(pageViewsByPath).length} pages
          </p>
        </Card>
        {types.map((type) => (
          <Link
            key={type}
            href={`/admin/analytics/events?type=${type}&range=30`}
            className="block group"
          >
            <Card className="p-3 sm:p-6 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
              <p className="text-text-muted text-xs sm:text-sm">{EVENT_LABELS[type]}</p>
              <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-primary group-hover:text-primary-dark">
                {totals30[type] || 0}
              </p>
              <p className="text-xs text-text-muted mt-1">
                {totals7[type] || 0} in last 7 days
              </p>
            </Card>
          </Link>
        ))}
        <Link
          href="/admin/analytics/events?type=booking_completed&range=30"
          className="block group"
        >
          <Card className="p-3 sm:p-6 border-2 border-accent/40 hover:shadow-md transition-all cursor-pointer h-full">
            <p className="text-text-muted text-xs sm:text-sm">Conversion Rate</p>
            <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-accent">
              {conversionRate}{conversionRate !== '—' ? '%' : ''}
            </p>
            <p className="text-xs text-text-muted mt-1">
              Booking started → completed (30d)
            </p>
          </Card>
        </Link>
      </div>

      {topPages.length > 0 && (
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-bold text-foreground mb-4">
            Top Pages (Last 30 Days)
          </h3>
          <div className="space-y-2">
            {topPages.map(([path, count]) => (
              <div key={path} className="flex items-center gap-3 text-sm">
                <span className="w-32 sm:w-48 text-foreground text-xs truncate flex-shrink-0">
                  {path}
                </span>
                <div className="flex-1 bg-secondary/20 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(count / maxPageViews) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right text-foreground font-medium text-xs flex-shrink-0">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <h2 className="text-lg sm:text-xl font-bold text-foreground mb-3 sm:mb-4">Historical (Website)</h2>
      <p className="text-text-muted text-xs sm:text-sm mb-4">
        Counts pulled from the database — every client and booking here came through the website.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Link href="/admin/analytics/website-clients?range=all" className="block group">
          <Card className="p-3 sm:p-6 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
            <p className="text-text-muted text-xs sm:text-sm">Total Website Clients</p>
            <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-primary group-hover:text-primary-dark">
              {clientsAll || 0}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {clients30 || 0} new in 30d · {clients90 || 0} in 90d
            </p>
          </Card>
        </Link>
        <Link href="/admin/analytics/website-bookings?range=all" className="block group">
          <Card className="p-3 sm:p-6 hover:shadow-md hover:border-primary/40 transition-all cursor-pointer h-full">
            <p className="text-text-muted text-xs sm:text-sm">Total Booking Requests</p>
            <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-primary group-hover:text-primary-dark">
              {bookingsAll || 0}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {bookings30 || 0} in 30d · {bookings90 || 0} in 90d
            </p>
          </Card>
        </Link>
      </div>

      <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-bold text-foreground mb-4">
          Booking Requests by Month
        </h3>
        <div className="space-y-2">
          {monthBuckets.map((b) => (
            <Link
              key={b.key}
              href={`/admin/analytics/website-bookings?month=${b.key}`}
              className="flex items-center gap-3 text-sm hover:bg-secondary/10 rounded px-1 py-0.5 -mx-1 transition-colors"
            >
              <span className="w-10 text-text-muted text-xs flex-shrink-0">{b.label}</span>
              <div className="flex-1 bg-secondary/20 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${(b.count / maxMonth) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right text-foreground font-medium text-xs flex-shrink-0">
                {b.count}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">Recent Activity</h2>
        {recent.length === 0 ? (
          <p className="text-text-muted text-center py-6 text-sm">
            No events yet. Activity will appear here as visitors interact with the site.
          </p>
        ) : (
          <div className="space-y-2">
            {recent.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 py-2 px-3 bg-secondary/10 rounded-lg text-sm"
              >
                <div className="min-w-0">
                  <span className="font-medium text-foreground">
                    {EVENT_LABELS[e.event_type] || e.event_type}
                  </span>
                  {e.source && (
                    <span className="text-text-muted ml-2">· {e.source}</span>
                  )}
                </div>
                <span className="text-text-muted text-xs flex-shrink-0">
                  {format(toZonedTime(new Date(e.created_at), BUSINESS_TIMEZONE), 'MMM d, h:mm a')}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <p className="text-xs text-text-muted mt-6">
        Page views & visitor counts are tracked via Vercel Analytics — view them in the Vercel dashboard.
      </p>
    </div>
  )
}
