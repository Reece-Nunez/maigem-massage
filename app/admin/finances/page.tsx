import { Card } from '@/components/ui/card'
import { format, subMonths, addDays, startOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { getSquarePayments, type AdminPayment } from '@/lib/square/payments'
import { getSquareBookings } from '@/lib/square/admin'
import { getSquareServices } from '@/lib/square/services'
import { RefreshSquareButton } from '@/components/admin/refresh-button'
import {
  calculateDelta,
  getComparisonRange,
  getDateRange,
  isValidComparisonPreset,
  isValidDateRangePreset,
  type ComparisonPreset,
  type DateRangePreset,
} from '@/lib/utils/date-ranges'
import { FinancesFilters } from './finances-filters'

const BUSINESS_TIMEZONE = 'America/Chicago'

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function inRange(payment: AdminPayment, start: Date | null, end: Date): boolean {
  const created = new Date(payment.createdAt).getTime()
  if (start && created < start.getTime()) return false
  if (created > end.getTime()) return false
  return true
}

function totals(payments: AdminPayment[]) {
  return payments.reduce(
    (acc, p) => ({
      gross: acc.gross + p.gross,
      amount: acc.amount + p.amount,
      tip: acc.tip + p.tip,
      fees: acc.fees + p.fees,
      refunded: acc.refunded + p.refunded,
      net: acc.net + p.net,
      count: acc.count + 1,
    }),
    { gross: 0, amount: 0, tip: 0, fees: 0, refunded: 0, net: 0, count: 0 }
  )
}

function DeltaBadge({
  current,
  previous,
  invertColors = false,
}: {
  current: number
  previous: number
  invertColors?: boolean
}) {
  const { pct, direction } = calculateDelta(current, previous)
  if (direction === 'na') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        N/A
      </span>
    )
  }
  if (direction === 'flat') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        0%
      </span>
    )
  }
  // For "good = down" metrics like fees, swap colors
  const isGood =
    invertColors ? direction === 'down' : direction === 'up'
  const colorClass = isGood
    ? 'bg-green-100 text-green-700'
    : 'bg-red-100 text-red-700'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        {direction === 'up' ? (
          <path
            fillRule="evenodd"
            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
            clipRule="evenodd"
          />
        ) : (
          <path
            fillRule="evenodd"
            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 112 0v7.586l2.293-2.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        )}
      </svg>
      {Math.abs(pct!).toFixed(2)}%
    </span>
  )
}

export const dynamic = 'force-dynamic'

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; compare?: string }>
}) {
  const { date: dateParam, compare: compareParam } = await searchParams

  const datePreset: DateRangePreset =
    dateParam && isValidDateRangePreset(dateParam) ? dateParam : 'this_week'
  const comparePreset: ComparisonPreset =
    compareParam && isValidComparisonPreset(compareParam)
      ? compareParam
      : 'prior_year'

  const now = new Date()
  const primary = getDateRange(datePreset, now)
  const comparison = getComparisonRange(primary, comparePreset)

  const [allPayments, allBookings, services] = await Promise.all([
    getSquarePayments(),
    getSquareBookings(),
    getSquareServices(),
  ])

  // Only count completed/approved payments toward revenue
  const completed = allPayments.filter(
    (p) => p.status === 'COMPLETED' || p.status === 'APPROVED'
  )

  const primaryPayments = completed.filter((p) =>
    inRange(p, primary.start, primary.end)
  )
  const comparisonPayments = comparison
    ? completed.filter((p) => inRange(p, comparison.start, comparison.end))
    : []

  const cur = totals(primaryPayments)
  const prev = totals(comparisonPayments)

  const avgTransaction =
    cur.count > 0 ? Math.round(cur.gross / cur.count) : 0
  const prevAvgTransaction =
    prev.count > 0 ? Math.round(prev.gross / prev.count) : 0

  const feePercent =
    cur.gross > 0 ? ((cur.fees / cur.gross) * 100).toFixed(2) : '0.00'

  // Per-month chart for the last 12 months — kept independent of the
  // selected range so the chart always shows trend context.
  const monthBuckets: { label: string; key: string; gross: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = subMonths(now, i)
    monthBuckets.push({
      label: format(d, 'MMM'),
      key: format(d, 'yyyy-MM'),
      gross: 0,
    })
  }
  for (const p of completed) {
    const zoned = toZonedTime(new Date(p.createdAt), BUSINESS_TIMEZONE)
    const key = format(zoned, 'yyyy-MM')
    const bucket = monthBuckets.find((b) => b.key === key)
    if (bucket) bucket.gross += p.gross
  }
  const maxMonth = Math.max(1, ...monthBuckets.map((b) => b.gross))

  // Recent transactions in the primary window (latest 25)
  const recent = primaryPayments.slice(0, 25)

  // ----- Projected income from upcoming confirmed bookings -----
  // Maps Square's appointment-segment serviceVariationId -> price. Some
  // existing bookings may use catalog item IDs instead, so we check both.
  const serviceById = new Map<string, number>()
  for (const s of services) {
    if (s.price_cents != null) {
      if (s.square_variation_id) serviceById.set(s.square_variation_id, s.price_cents)
      if (s.square_catalog_id) serviceById.set(s.square_catalog_id, s.price_cents)
    }
  }
  // Cross-reference by service name as a fallback
  const serviceByName = new Map<string, number>()
  for (const s of services) {
    if (s.price_cents != null) serviceByName.set(s.name, s.price_cents)
  }

  const todayStart = startOfDay(now)
  const next7End = addDays(todayStart, 7)
  const next30End = addDays(todayStart, 30)

  function bookingPrice(serviceName: string): number {
    return serviceByName.get(serviceName) || 0
  }

  // Square processing fee estimate for in-person card-present transactions
  // on the free Appointments tier: 2.6% + 10¢
  function estimateFee(cents: number): number {
    if (cents <= 0) return 0
    return Math.round(cents * 0.026 + 10)
  }

  const upcomingBookings = allBookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.startAt) >= todayStart
  )

  function projectFor(endDate: Date) {
    const inWindow = upcomingBookings.filter((b) => new Date(b.startAt) < endDate)
    let gross = 0
    let fees = 0
    let priced = 0
    let unpriced = 0
    for (const b of inWindow) {
      const price = bookingPrice(b.serviceName)
      if (price > 0) {
        gross += price
        fees += estimateFee(price) // per-booking fee, summed
        priced += 1
      } else {
        unpriced += 1
      }
    }
    const net = gross - fees
    return {
      count: inWindow.length,
      priced,
      unpriced,
      gross,
      fees,
      net,
    }
  }

  const proj7 = projectFor(next7End)
  const proj30 = projectFor(next30End)
  const projAll = projectFor(new Date(8.64e15)) // far future = all upcoming

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Finances</h1>
        <RefreshSquareButton />
      </div>
      <p className="text-text-muted text-sm mb-6">
        Revenue, Square fees, and transactions — pulled directly from Square.
      </p>

      <FinancesFilters date={datePreset} compare={comparePreset} />

      <p className="text-text-muted text-xs mb-4">
        {primary.start
          ? `${format(primary.start, 'MMM d, yyyy')} – ${format(primary.end, 'MMM d, yyyy')}`
          : `Up through ${format(primary.end, 'MMM d, yyyy')}`}
        {comparison && (
          <>
            {' '}
            <span className="text-text-muted/60">vs</span>{' '}
            {format(comparison.start!, 'MMM d, yyyy')} – {format(comparison.end, 'MMM d, yyyy')}
          </>
        )}
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-6 border-2 border-primary/30 bg-primary/5">
          <p className="text-text-muted text-xs sm:text-sm">Net Revenue</p>
          <div className="flex items-baseline gap-2 flex-wrap mt-1 sm:mt-2">
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {formatCents(cur.net)}
            </p>
            {comparison && <DeltaBadge current={cur.net} previous={prev.net} />}
          </div>
          {comparison && (
            <p className="text-xs text-text-muted mt-1">
              vs {formatCents(prev.net)}
            </p>
          )}
          {!comparison && (
            <p className="text-xs text-text-muted mt-1">After fees & refunds</p>
          )}
        </Card>
        <Card className="p-3 sm:p-6">
          <p className="text-text-muted text-xs sm:text-sm">Gross Revenue</p>
          <div className="flex items-baseline gap-2 flex-wrap mt-1 sm:mt-2">
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {formatCents(cur.gross)}
            </p>
            {comparison && <DeltaBadge current={cur.gross} previous={prev.gross} />}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {comparison
              ? `vs ${formatCents(prev.gross)}`
              : `Includes ${formatCents(cur.tip)} in tips`}
          </p>
        </Card>
        <Card className="p-3 sm:p-6 border border-amber-200 bg-amber-50">
          <p className="text-text-muted text-xs sm:text-sm">Square Fees</p>
          <div className="flex items-baseline gap-2 flex-wrap mt-1 sm:mt-2">
            <p className="text-2xl sm:text-3xl font-bold text-amber-700">
              {formatCents(cur.fees)}
            </p>
            {comparison && (
              <DeltaBadge
                current={cur.fees}
                previous={prev.fees}
                invertColors
              />
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {comparison ? `vs ${formatCents(prev.fees)}` : `${feePercent}% of gross`}
          </p>
        </Card>
        <Card className="p-3 sm:p-6">
          <p className="text-text-muted text-xs sm:text-sm">Transactions</p>
          <div className="flex items-baseline gap-2 flex-wrap mt-1 sm:mt-2">
            <p className="text-2xl sm:text-3xl font-bold text-foreground">
              {cur.count}
            </p>
            {comparison && <DeltaBadge current={cur.count} previous={prev.count} />}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {comparison
              ? `vs ${prev.count}`
              : `Avg ${formatCents(avgTransaction)}`}
          </p>
          {comparison && (
            <p className="text-xs text-text-muted">
              Avg {formatCents(avgTransaction)} (vs {formatCents(prevAvgTransaction)})
            </p>
          )}
        </Card>
      </div>

      {cur.refunded > 0 && (
        <Card className="p-4 mb-6 sm:mb-8 border border-red-200 bg-red-50">
          <p className="text-sm text-red-700">
            <span className="font-semibold">Refunds in this period:</span>{' '}
            {formatCents(cur.refunded)}
          </p>
        </Card>
      )}

      {/* Projected income from upcoming confirmed bookings */}
      <Card className="p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-primary/30">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-base sm:text-lg font-bold text-foreground">
            Projected Income (Upcoming)
          </h3>
          <p className="text-xs text-text-muted">
            Based on confirmed bookings · fees estimated at 2.6% + 10¢
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-text-muted">Next 7 days</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">
              {formatCents(proj7.net)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {proj7.count} booking{proj7.count === 1 ? '' : 's'} ·{' '}
              {formatCents(proj7.gross)} gross
            </p>
            {proj7.unpriced > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                {proj7.unpriced} booking{proj7.unpriced === 1 ? ' has' : 's have'} no
                listed price
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-text-muted">Next 30 days</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">
              {formatCents(proj30.net)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {proj30.count} booking{proj30.count === 1 ? '' : 's'} ·{' '}
              {formatCents(proj30.gross)} gross
            </p>
            {proj30.unpriced > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                {proj30.unpriced} without a listed price
              </p>
            )}
          </div>
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-xs text-text-muted">All upcoming</p>
            <p className="text-2xl sm:text-3xl font-bold text-primary mt-1">
              {formatCents(projAll.net)}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {projAll.count} booking{projAll.count === 1 ? '' : 's'} ·{' '}
              {formatCents(projAll.gross)} gross
            </p>
            {projAll.unpriced > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                {projAll.unpriced} without a listed price
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
        <h3 className="text-base sm:text-lg font-bold text-foreground mb-4">
          Revenue by Month (Last 12 Months)
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
