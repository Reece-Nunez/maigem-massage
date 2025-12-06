import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { AppointmentActions } from './appointment-actions'
import type { Appointment, Client, Service } from '@/types/database'

const BUSINESS_TIMEZONE = 'America/Chicago'

type AppointmentWithRelations = Appointment & {
  client: Client | null
  service: Service | null
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter = 'upcoming' } = await searchParams
  const supabase = await createClient()
  const now = new Date()

  let appointments: AppointmentWithRelations[] = []

  if (filter === 'pending') {
    const { data } = await supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .eq('status', 'pending')
      .order('start_datetime', { ascending: true })
      .limit(50)
    appointments = (data || []) as AppointmentWithRelations[]
  } else if (filter === 'upcoming') {
    const { data } = await supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .gte('start_datetime', now.toISOString())
      .eq('status', 'confirmed')
      .order('start_datetime', { ascending: true })
      .limit(50)
    appointments = (data || []) as AppointmentWithRelations[]
  } else if (filter === 'past') {
    const { data } = await supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .lt('start_datetime', now.toISOString())
      .order('start_datetime', { ascending: false })
      .limit(50)
    appointments = (data || []) as AppointmentWithRelations[]
  } else if (filter === 'cancelled') {
    const { data } = await supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .eq('status', 'cancelled')
      .order('start_datetime', { ascending: false })
      .limit(50)
    appointments = (data || []) as AppointmentWithRelations[]
  } else {
    // 'all' filter
    const { data } = await supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .order('start_datetime', { ascending: false })
      .limit(50)
    appointments = (data || []) as AppointmentWithRelations[]
  }

  // Get pending count for badge
  const { count: pendingCount } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  const filters = [
    { value: 'pending', label: 'Pending', count: pendingCount || 0 },
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
