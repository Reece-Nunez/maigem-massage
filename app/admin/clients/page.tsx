import Link from 'next/link'
import { getSquareCustomers, getSquareBookings } from '@/lib/square/admin'
import { RefreshSquareButton } from '@/components/admin/refresh-button'
import { ClientsTable } from './clients-table'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const [customers, bookings] = await Promise.all([
    getSquareCustomers(),
    getSquareBookings(),
  ])

  // Build per-customer aggregates from the booking history. This lets the
  // page filter/sort by recent activity rather than just sign-up date.
  const bookingCount = new Map<string, number>()
  const lastVisit = new Map<string, string>() // ISO datetime, most recent past appointment
  const nextVisit = new Map<string, string>() // ISO datetime, earliest future appointment
  const now = Date.now()

  for (const b of bookings) {
    if (!b.customerId) continue
    bookingCount.set(b.customerId, (bookingCount.get(b.customerId) || 0) + 1)

    const startMs = new Date(b.startAt).getTime()
    if (startMs <= now && (b.status === 'confirmed' || b.status === 'completed')) {
      const existing = lastVisit.get(b.customerId)
      if (!existing || new Date(existing).getTime() < startMs) {
        lastVisit.set(b.customerId, b.startAt)
      }
    }
    if (startMs > now && b.status === 'confirmed') {
      const existing = nextVisit.get(b.customerId)
      if (!existing || new Date(existing).getTime() > startMs) {
        nextVisit.set(b.customerId, b.startAt)
      }
    }
  }

  const customersEnriched = customers.map((c) => ({
    ...c,
    bookingCount: bookingCount.get(c.id) || 0,
    lastVisit: lastVisit.get(c.id) || null,
    nextVisit: nextVisit.get(c.id) || null,
  }))

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/clients/duplicates"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-secondary/60 text-foreground hover:bg-secondary/30 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
            </svg>
            Find Duplicates
          </Link>
          <RefreshSquareButton />
        </div>
      </div>
      <p className="text-text-muted text-sm mb-6 sm:mb-8">
        {customers.length} total clients from Square
      </p>

      <ClientsTable customers={customersEnriched} />
    </div>
  )
}
