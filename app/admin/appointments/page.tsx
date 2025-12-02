import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { AppointmentActions } from './appointment-actions'

const BUSINESS_TIMEZONE = 'America/Chicago'

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'upcoming' } = await searchParams
  const supabase = await createClient()
  const now = new Date()

  let query = supabase
    .from('appointments')
    .select(`
      *,
      client:clients(*),
      service:services(*)
    `)
    .order('start_datetime', { ascending: filter === 'upcoming' })

  if (filter === 'upcoming') {
    query = query.gte('start_datetime', now.toISOString()).neq('status', 'cancelled')
  } else if (filter === 'past') {
    query = query.lt('start_datetime', now.toISOString())
  } else if (filter === 'cancelled') {
    query = query.eq('status', 'cancelled')
  }

  const { data: appointments } = await query.limit(50)

  const filters = [
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Appointments</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {filters.map((f) => (
          <a
            key={f.value}
            href={`/admin/appointments?filter=${f.value}`}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary text-white'
                : 'bg-secondary/30 text-foreground hover:bg-secondary/50'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {/* Appointments List */}
      <Card className="overflow-hidden">
        {appointments && appointments.length > 0 ? (
          <div className="divide-y divide-secondary/30">
            {appointments.map((appointment) => {
              const startDate = toZonedTime(
                new Date(appointment.start_datetime),
                BUSINESS_TIMEZONE
              )
              const endDate = toZonedTime(
                new Date(appointment.end_datetime),
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
                        {appointment.client?.first_name?.[0]}
                        {appointment.client?.last_name?.[0]}
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {appointment.client?.first_name} {appointment.client?.last_name}
                        </h3>
                        <p className="text-primary font-medium">
                          {appointment.service?.name}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-text-muted">
                          <span>{format(startDate, 'EEEE, MMMM d, yyyy')}</span>
                          <span>
                            {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                          </span>
                        </div>
                        {appointment.client_notes && (
                          <p className="mt-2 text-sm text-text-muted bg-secondary/20 p-2 rounded">
                            <strong>Notes:</strong> {appointment.client_notes}
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
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {appointment.status.charAt(0).toUpperCase() +
                          appointment.status.slice(1)}
                      </span>
                      <AppointmentActions
                        appointmentId={appointment.id}
                        currentStatus={appointment.status}
                        clientEmail={appointment.client?.email}
                        clientPhone={appointment.client?.phone}
                      />
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
