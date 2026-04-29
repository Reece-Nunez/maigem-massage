import { getSquareCustomers, getSquareBookings } from '@/lib/square/admin'
import { ClientsTable } from './clients-table'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const [customers, bookings] = await Promise.all([
    getSquareCustomers(),
    getSquareBookings(),
  ])

  // Count bookings per customer
  const bookingCounts = new Map<string, number>()
  for (const booking of bookings) {
    if (booking.customerId) {
      bookingCounts.set(
        booking.customerId,
        (bookingCounts.get(booking.customerId) || 0) + 1
      )
    }
  }

  const customersWithCounts = customers.map((c) => ({
    ...c,
    bookingCount: bookingCounts.get(c.id) || 0,
  }))

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Clients</h1>
      <p className="text-text-muted text-sm mb-6 sm:mb-8">
        {customers.length} total clients from Square
      </p>

      <ClientsTable customers={customersWithCounts} />
    </div>
  )
}
