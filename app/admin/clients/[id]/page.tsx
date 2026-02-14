import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSquareCustomerById, getSquareBookingsForCustomer } from '@/lib/square/admin'

const BUSINESS_TIMEZONE = 'America/Chicago'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  // Fetch customer and their bookings from Square
  const [customer, bookings] = await Promise.all([
    getSquareCustomerById(id),
    getSquareBookingsForCustomer(id),
  ])

  if (!customer) {
    notFound()
  }

  const confirmedCount = bookings.filter(b => b.status === 'confirmed').length
  const upcomingCount = bookings.filter(
    b => b.status === 'confirmed' && new Date(b.startAt) > new Date()
  ).length

  return (
    <div>
      <Link
        href="/admin/clients"
        className="text-primary hover:underline text-sm mb-4 inline-block"
      >
        ← Back to Clients
      </Link>

      <div className="flex items-start gap-6 mb-8">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
          {customer.firstName?.[0]}
          {customer.lastName?.[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {customer.firstName} {customer.lastName}
          </h1>
          <div className="flex gap-4 mt-2 text-text-muted">
            {customer.email && (
              <a href={`mailto:${customer.email}`} className="hover:text-primary">
                {customer.email}
              </a>
            )}
            {customer.email && customer.phone && <span>•</span>}
            {customer.phone && (
              <a href={`tel:${customer.phone}`} className="hover:text-primary">
                {customer.phone}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-text-muted text-sm">Total Appointments</p>
          <p className="text-3xl font-bold text-primary mt-1">
            {bookings.length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-text-muted text-sm">Confirmed</p>
          <p className="text-3xl font-bold text-primary mt-1">{confirmedCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-text-muted text-sm">Upcoming</p>
          <p className="text-3xl font-bold text-primary mt-1">{upcomingCount}</p>
        </Card>
      </div>

      {/* Appointment History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-6">Appointment History</h2>

        {bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const startDate = toZonedTime(
                new Date(booking.startAt),
                BUSINESS_TIMEZONE
              )
              const isPast = new Date(booking.startAt) < new Date()

              return (
                <div
                  key={booking.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    isPast ? 'bg-secondary/10' : 'bg-primary/5'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.serviceName}
                    </p>
                    <p className="text-sm text-text-muted">
                      {format(startDate, 'EEEE, MMMM d, yyyy')} at{' '}
                      {format(startDate, 'h:mm a')}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      booking.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : booking.status === 'no_show'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {booking.status === 'no_show'
                      ? 'No Show'
                      : booking.status.charAt(0).toUpperCase() +
                        booking.status.slice(1)}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-text-muted text-center py-8">No appointments yet</p>
        )}
      </Card>
    </div>
  )
}
