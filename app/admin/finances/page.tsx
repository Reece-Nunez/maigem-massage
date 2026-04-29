import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { format, subDays, subMonths, startOfDay, startOfMonth } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { getSquarePayments } from '@/lib/square/payments'

const BUSINESS_TIMEZONE = 'America/Chicago'

const RANGES: Record<string, { days: number | null; label: string }> = {
  '30': { days: 30, label: 'Last 30 days' },
  '90': { days: 90, label: 'Last 90 days' },
  '365': { days: 365, label: 'Last year' },
  'all': { days: null, label: 'All time' },
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export const dynamic = 'force-dynamic'

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range = '30' } = await searchParams
  const rangeConfig = RANGES[range] || RANGES['30']

  const allPayments = await getSquarePayments()

  // Filter payments by selected range
  const cutoff =
    rangeConfig.days !== null
      ? startOfDay(subDays(new Date(), rangeConfig.days))
      : null

  const filtered = cutoff
    ? allPayments.filter((p) => new Date(p.createdAt) >= cutoff)
    : allPayments

  // Only count completed/approved payments toward revenue
  const completed = filtered.filter(
    (p) => p.status === 'COMPLETED' || p.status === 'APPROVED'
  )

  const totals = completed.reduce(
    (acc, p) => ({
      gross: acc.gross + p.gross,
      amount: acc.amount + p.amount,
      tip: acc.tip + p.tip,
      fees: acc.fees + p.fees,
      refunded: acc.refunded + p.refunded,
      net: acc.net + p.net,
    }),
    { gross: 0, amount: 0, tip: 0, fees: 0, refunded: 0, net: 0 }
  )

  const transactionCount = completed.length
  const avgTransaction =
    transactionCount > 0 ? Math.round(totals.gross / transactionCount) : 0
  const feePercent =
    totals.gross > 0 ? ((totals.fees / totals.gross) * 100).toFixed(2) : '0.00'

  // Per-month revenue for last 12 months
  const now = new Date()
  const monthBuckets: { label: string; key: string; gross: number; net: number; fees: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    monthBuckets.push({
      label: format(d, 'MMM'),
      key: format(d, 'yyyy-MM'),
      gross: 0,
      net: 0,
      fees: 0,
    })
  }
  for (const p of allPayments) {
    if (p.status !== 'COMPLETED' && p.status !== 'APPROVED') continue
    const zoned = toZonedTime(new Date(p.createdAt), BUSINESS_TIMEZONE)
    const key = format(zoned, 'yyyy-MM')
    const bucket = monthBuckets.find((b) => b.key === key)
    if (bucket) {
      bucket.gross += p.gross
      bucket.net += p.net
      bucket.fees += p.fees
    }
  }
  const maxMonth = Math.max(1, ...monthBuckets.map((b) => b.gross))

  // Recent transactions (latest 25 within range)
  const recent = filtered.slice(0, 25)

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Finances</h1>
      <p className="text-text-muted text-sm mb-6">
        Revenue, Square fees, and transactions — pulled directly from Square.
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {Object.entries(RANGES).map(([key, cfg]) => (
          <Link
            key={key}
            href={`/admin/finances?range=${key}`}
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-6 border-2 border-primary/30 bg-primary/5">
          <p className="text-text-muted text-xs sm:text-sm">Net Revenue</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-primary">
            {formatCents(totals.net)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            After Square fees & refunds
          </p>
        </Card>
        <Card className="p-3 sm:p-6">
          <p className="text-text-muted text-xs sm:text-sm">Gross Revenue</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-foreground">
            {formatCents(totals.gross)}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Includes {formatCents(totals.tip)} in tips
          </p>
        </Card>
        <Card className="p-3 sm:p-6 border border-amber-200 bg-amber-50">
          <p className="text-text-muted text-xs sm:text-sm">Square Fees</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-amber-700">
            {formatCents(totals.fees)}
          </p>
          <p className="text-xs text-text-muted mt-1">{feePercent}% of gross</p>
        </Card>
        <Card className="p-3 sm:p-6">
          <p className="text-text-muted text-xs sm:text-sm">Transactions</p>
          <p className="text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 text-foreground">
            {transactionCount}
          </p>
          <p className="text-xs text-text-muted mt-1">
            Avg {formatCents(avgTransaction)}
          </p>
        </Card>
      </div>

      {totals.refunded > 0 && (
        <Card className="p-4 mb-6 sm:mb-8 border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            <span className="font-semibold">Refunds in this period:</span>{' '}
            {formatCents(totals.refunded)}
          </p>
        </Card>
      )}

      <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-bold text-foreground mb-4">
          Revenue by Month (Gross)
        </h3>
        <div className="space-y-2">
          {monthBuckets.map((b) => (
            <div key={b.key} className="flex items-center gap-3 text-sm">
              <span className="w-10 text-text-muted text-xs flex-shrink-0">{b.label}</span>
              <div className="flex-1 bg-secondary/20 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${(b.gross / maxMonth) * 100}%` }}
                />
              </div>
              <span className="w-20 text-right text-foreground font-medium text-xs flex-shrink-0">
                {b.gross > 0 ? formatCents(b.gross) : '—'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-4">
          Recent Transactions
        </h2>
        {recent.length === 0 ? (
          <p className="text-text-muted text-center py-6 text-sm">
            No payments in this period yet.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full text-sm">
              <thead className="bg-secondary/20 border-b border-secondary/30">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-foreground">When</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Gross</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground hidden sm:table-cell">
                    Tip
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Fee</th>
                  <th className="text-right px-4 py-3 font-medium text-foreground">Net</th>
                  <th className="text-left px-4 py-3 font-medium text-foreground hidden md:table-cell">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {recent.map((p) => {
                  const zoned = toZonedTime(new Date(p.createdAt), BUSINESS_TIMEZONE)
                  const isCompleted =
                    p.status === 'COMPLETED' || p.status === 'APPROVED'
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-secondary/20 last:border-0 hover:bg-secondary/10"
                    >
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {format(zoned, 'MMM d, yyyy')}
                        <span className="text-xs ml-2">
                          {format(zoned, 'h:mm a')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">
                        {formatCents(p.gross)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted hidden sm:table-cell">
                        {p.tip > 0 ? formatCents(p.tip) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-amber-700">
                        {p.fees > 0 ? `−${formatCents(p.fees)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-primary font-medium">
                        {formatCents(p.net)}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            isCompleted
                              ? 'bg-green-100 text-green-800'
                              : p.status === 'FAILED' || p.status === 'CANCELED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {p.status.toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
