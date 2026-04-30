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
        <RefreshSquareButton />
      </div>
      <p className="text-text-muted text-sm mb-6 sm:mb-8">
        {customers.length} total clients from Square
      </p>

      <ClientsTable customers={customersEnriched} />
    </div>
  )
}
