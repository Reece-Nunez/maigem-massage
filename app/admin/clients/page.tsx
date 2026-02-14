import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import Link from 'next/link'
import { getSquareCustomers, getSquareBookings } from '@/lib/square/admin'

export const dynamic = 'force-dynamic'

export default async function ClientsPage() {
  // Fetch customers and bookings from Square
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

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Clients</h1>
      <p className="text-text-muted mb-8">
        All clients from Square ({customers.length} total).
      </p>

      <Card className="overflow-hidden">
        {customers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/20">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Phone
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Appointments
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Joined
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/30">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {customer.firstName?.[0]}
                          {customer.lastName?.[0]}
                        </div>
                        <span className="font-medium text-foreground">
                          {customer.firstName} {customer.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {customer.email ? (
                        <a
                          href={`mailto:${customer.email}`}
                          className="hover:text-primary transition-colors"
                        >
                          {customer.email}
                        </a>
                      ) : (
                        <span className="text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-muted">
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="hover:text-primary transition-colors"
                        >
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {bookingCounts.get(customer.id) || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-sm">
                      {customer.createdAt
                        ? format(new Date(customer.createdAt), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/clients/${customer.id}`}
                        className="text-primary hover:underline text-sm"
                      >
                        View History
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted">
            <p>No clients yet</p>
            <p className="text-sm mt-2">
              Clients will appear here after they book their first appointment.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
