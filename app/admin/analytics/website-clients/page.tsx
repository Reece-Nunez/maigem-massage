import { createAdminClient } from '@/lib/supabase/admin'
import { Card } from '@/components/ui/card'
import { format, subDays, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'

const BUSINESS_TIMEZONE = 'America/Chicago'

const RANGES: Record<string, { days: number | null; label: string }> = {
  '30': { days: 30, label: 'Last 30 days' },
  '90': { days: 90, label: 'Last 90 days' },
  '365': { days: 365, label: 'Last year' },
  'all': { days: null, label: 'All time' },
}

type ClientRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  square_customer_id: string | null
  created_at: string
}

export const dynamic = 'force-dynamic'

export default async function WebsiteClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = '30' } = await searchParams
  const rangeConfig = RANGES[range] || RANGES['30']
  const supabase = createAdminClient()

  let query = supabase
    .from('clients')
    .select('id, first_name, last_name, email, phone, square_customer_id, created_at')
    .order('created_at', { ascending: false })

  if (rangeConfig.days !== null) {
    const since = startOfDay(subDays(new Date(), rangeConfig.days)).toISOString()
    query = query.gte('created_at', since)
  }

  const { data } = await query
  const clients = (data as ClientRow[]) || []

  return (
    <div>
      <Link
        href="/admin/analytics"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-4"
      >
        ← Back to Analytics
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Website Clients
      </h1>
      <p className="text-text-muted text-sm mb-6">
        {clients.length} client{clients.length === 1 ? '' : 's'} who signed up through the
        website · {rangeConfig.label}
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(RANGES).map(([key, cfg]) => (
          <Link
            key={key}
            href={`/admin/analytics/website-clients?range=${key}`}
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

      {clients.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-text-muted text-sm">
            No website clients in this period yet.
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/20 border-b border-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden md:table-cell">
                    Phone
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Joined</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const zoned = toZonedTime(new Date(c.created_at), BUSINESS_TIMEZONE)
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-secondary/20 last:border-0 hover:bg-secondary/10"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                            {c.first_name?.[0]}
                            {c.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">
                              {c.first_name} {c.last_name}
                            </div>
                            <div className="md:hidden text-xs text-text-muted truncate">
                              {c.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        <a
                          href={`mailto:${c.email}`}
                          className="hover:text-primary transition-colors"
                        >
                          {c.email}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        <a
                          href={`tel:${c.phone}`}
                          className="hover:text-primary transition-colors"
                        >
                          {c.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {format(zoned, 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        {c.square_customer_id ? (
                          <Link
                            href={`/admin/clients/${c.square_customer_id}`}
                            className="text-primary hover:underline text-sm whitespace-nowrap"
                          >
                            View
                          </Link>
                        ) : (
                          <span className="text-text-muted/50 text-sm">—</span>
                        )}
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
