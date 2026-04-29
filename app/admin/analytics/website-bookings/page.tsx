import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { format, subDays, startOfDay, parseISO } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'

const BUSINESS_TIMEZONE = 'America/Chicago'

const RANGES: Record<string, { days: number | null; label: string }> = {
  '30': { days: 30, label: 'Last 30 days' },
  '90': { days: 90, label: 'Last 90 days' },
  '365': { days: 365, label: 'Last year' },
  'all': { days: null, label: 'All time' },
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  no_show: 'bg-gray-100 text-gray-800',
}

type AppointmentRow = {
  id: string
  start_datetime: string
  status: string
  payment_method: string
  payment_status: string
  created_at: string
  client: { first_name: string; last_name: string; email: string; phone: string } | null
  service: { name: string; price_display: string | null } | null
}

export const dynamic = 'force-dynamic'

export default async function WebsiteBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; month?: string }>
}) {
  const { range = '30', month } = await searchParams
  const supabase = createAdminClient()

  let query = supabase
    .from('appointments')
    .select(`
      id, start_datetime, status, payment_method, payment_status, created_at,
      client:clients(first_name, last_name, email, phone),
      service:services(name, price_display)
    `)
    .order('created_at', { ascending: false })

  let rangeLabel: string
  if (month) {
    // Filter by specific month: format yyyy-MM
    const monthStart = parseISO(`${month}-01`)
    const nextMonth = new Date(monthStart)
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    query = query
      .gte('created_at', monthStart.toISOString())
      .lt('created_at', nextMonth.toISOString())
    rangeLabel = format(monthStart, 'MMMM yyyy')
  } else {
    const rangeConfig = RANGES[range] || RANGES['30']
    if (rangeConfig.days !== null) {
      const since = startOfDay(subDays(new Date(), rangeConfig.days)).toISOString()
      query = query.gte('created_at', since)
    }
    rangeLabel = rangeConfig.label
  }

  const { data } = await query
  const appointments = (data as unknown as AppointmentRow[]) || []

  return (
    <div>
      <Link
        href="/admin/analytics"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-4"
      >
        ← Back to Analytics
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Website Booking Requests
      </h1>
      <p className="text-text-muted text-sm mb-6">
        {appointments.length} booking
        {appointments.length === 1 ? '' : 's'} requested through the website · {rangeLabel}
      </p>

      {!month && (
        <div className="flex flex-wrap gap-2 mb-6">
          {Object.entries(RANGES).map(([key, cfg]) => (
            <Link
              key={key}
              href={`/admin/analytics/website-bookings?range=${key}`}
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
      )}

      {appointments.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-muted text-sm">
            No website booking requests in this period.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/20 border-b border-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden md:table-cell">
                    Service
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Appt Date</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden lg:table-cell">
                    Payment
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden lg:table-cell">
                    Requested
                  </th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => {
                  const apptDate = toZonedTime(
                    new Date(a.start_datetime),
                    BUSINESS_TIMEZONE
                  )
                  const requestedDate = toZonedTime(
                    new Date(a.created_at),
                    BUSINESS_TIMEZONE
                  )
                  const statusClass =
                    STATUS_COLORS[a.status] || 'bg-gray-100 text-gray-800'
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-secondary/20 last:border-0 hover:bg-secondary/10"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground truncate">
                          {a.client?.first_name} {a.client?.last_name}
                        </div>
                        <div className="text-xs text-text-muted truncate">
                          {a.client?.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        <div>{a.service?.name || '—'}</div>
                        {a.service?.price_display && (
                          <div className="text-xs text-text-muted/70">
                            {a.service.price_display}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        <div>{format(apptDate, 'MMM d, yyyy')}</div>
                        <div className="text-xs">{format(apptDate, 'h:mm a')}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden lg:table-cell">
                        <div className="text-xs">
                          {a.payment_method === 'pay_online' ? 'Online' : 'At appt'}
                        </div>
                        <div className="text-xs text-text-muted/70">
                          {a.payment_status}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs hidden lg:table-cell whitespace-nowrap">
                        {format(requestedDate, 'MMM d, h:mm a')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
