import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { format, subDays, startOfDay } from 'date-fns'

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
  const since30 = startOfDay(subDays(new Date(), 30)).toISOString()
  const since7 = startOfDay(subDays(new Date(), 7)).toISOString()

  const { data: events30 } = await supabase
    .from('analytics_events')
    .select('event_type, source, created_at')
    .gte('created_at', since30)
    .order('created_at', { ascending: false })

  const events: EventRow[] = (events30 as EventRow[]) || []
  const events7 = events.filter(e => e.created_at >= since7)

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
        {types.map((type) => (
          <Card key={type} className="p-3 sm:p-6">
            <p className="text-text-muted text-xs sm:text-sm">{EVENT_LABELS[type]}</p>
            <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-primary">
              {totals30[type] || 0}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {totals7[type] || 0} in last 7 days
            </p>
          </Card>
        ))}
        <Card className="p-3 sm:p-6 border-2 border-accent/40">
          <p className="text-text-muted text-xs sm:text-sm">Conversion Rate</p>
          <p className="text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 text-accent">
            {conversionRate}{conversionRate !== '—' ? '%' : ''}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Booking started → completed (30d)
          </p>
        </Card>
      </div>

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
                  {format(new Date(e.created_at), 'MMM d, h:mm a')}
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
