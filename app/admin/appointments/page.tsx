import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { AppointmentActions } from './appointment-actions'
import { getSquareBookings } from '@/lib/square/admin'
import type { Appointment, Client, Service } from '@/types/database'

const BUSINESS_TIMEZONE = 'America/Chicago'

type AppointmentWithRelations = Appointment & {
  client: Client | null
  service: Service | null
}

// Unified appointment display item (works for both Supabase pending and Square bookings)
interface DisplayAppointment {
  id: string
  status: string
  startAt: string
  endAt: string
  customerName: string
  customerInitials: string
  customerEmail: string | null
  customerPhone: string | null
  serviceName: string
  notes: string | null
  source: 'supabase' | 'square'
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'upcoming' } = await searchParams
  const supabase = await createClient()
  const now = new Date()

  let displayAppointments: DisplayAppointment[] = []
  let pendingCount = 0

  // Always fetch pending count from Supabase for the badge
  const { count } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
  pendingCount = count || 0

  if (filter === 'pending') {
    // Pending appointments are only in Supabase (not yet synced to Square)
    const { data } = await supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .eq('status', 'pending')
      .order('start_datetime', { ascending: true })
      .limit(50)

    const appointments = (data || []) as AppointmentWithRelations[]
    displayAppointments = appointments.map(a => ({
      id: a.id,
      status: a.status,
      startAt: a.start_datetime,
      endAt: a.end_datetime,
      customerName: `${a.client?.first_name || ''} ${a.client?.last_name || ''}`.trim(),
      customerInitials: `${a.client?.first_name?.[0] || ''}${a.client?.last_name?.[0] || ''}`,
      customerEmail: a.client?.email || null,
      customerPhone: a.client?.phone || null,
      serviceName: a.service?.name || 'Unknown Service',
      notes: a.client_notes || null,
      source: 'supabase',
    }))
  } else {
    // All other filters pull from Square
    const squareBookings = await getSquareBookings()

    let filtered = squareBookings
    if (filter === 'upcoming') {
      filtered = squareBookings
        .filter(b => b.status === 'confirmed' && new Date(b.startAt) > now)
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    } else if (filter === 'past') {
      filtered = squareBookings
        .filter(b => new Date(b.startAt) < now && b.status !== 'cancelled')
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    } else if (filter === 'cancelled') {
      filtered = squareBookings
        .filter(b => b.status === 'cancelled')
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
    }
    // 'all' shows everything, already sorted by date desc

    displayAppointments = filtered.slice(0, 50).map(b => ({
      id: b.id,
      status: b.status,
      startAt: b.startAt,
      endAt: b.endAt || b.startAt,
      customerName: b.customerName,
      customerInitials: b.customerName.split(' ').map(n => n[0]).join('').slice(0, 2),
      customerEmail: b.customerEmail,
      customerPhone: b.customerPhone,
      serviceName: b.serviceName,
      notes: b.notes,
      source: 'square',
    }))
  }

  const filters = [
    { value: 'pending', label: 'Pending', count: pendingCount },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Appointments</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <a
            key={f.value}
            href={`/admin/appointments?filter=${f.value}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
              filter === f.value
                ? f.value === 'pending' ? 'bg-yellow-500 text-white' : 'bg-primary text-white'
                : f.value === 'pending' && f.count && f.count > 0
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                  : 'bg-secondary/30 text-foreground hover:bg-secondary/50'
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                filter === f.value ? 'bg-white/20' : 'bg-yellow-500 text-white'
              }`}>
                {f.count}
              </span>
            )}
          </a>
        ))}
      </div>

      {/* Appointments List */}
      <Card className="overflow-hidden">
        {displayAppointments.length > 0 ? (
          <div className="divide-y divide-secondary/30">
            {displayAppointments.map((appointment) => {
              const startDate = toZonedTime(
                new Date(appointment.startAt),
                BUSINESS_TIMEZONE
              )
              const endDate = toZonedTime(
                new Date(appointment.endAt),
                BUSINESS_TIMEZONE
              )

              return (
                <div
                  key={appointment.id}
                  className="p-6 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {appointment.customerInitials}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {appointment.customerName}
                        </h3>
                        <p className="text-primary font-medium">
                          {appointment.serviceName}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                          <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
                          <span>
                            {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                          </span>
                        </div>
                        {appointment.notes && (
                          <p className="mt-2 text-sm text-text-muted bg-secondary/20 p-2 rounded">
                            <strong>Notes:</strong> {appointment.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          appointment.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : appointment.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : appointment.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : appointment.status === 'no_show'
                            ? 'bg-gray-100 text-gray-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {appointment.status === 'no_show'
                          ? 'No Show'
                          : appointment.status.charAt(0).toUpperCase() +
                            appointment.status.slice(1)}
                      </span>
                      {appointment.source === 'supabase' && (
                        <AppointmentActions
                          appointmentId={appointment.id}
                          currentStatus={appointment.status}
                          clientEmail={appointment.customerEmail || undefined}
                          clientPhone={appointment.customerPhone || undefined}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted">
            <p>No appointments found</p>
          </div>
        )}
      </Card>
    </div>
  )
}
