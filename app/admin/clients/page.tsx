import { getSquareCustomers, getSquareBookingCountsByCustomer } from '@/lib/square/admin'
import { ClientsTable } from './clients-table'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  const [customers, bookingCounts] = await Promise.all([
    getSquareCustomers(),
    getSquareBookingCountsByCustomer(),
  ])

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
