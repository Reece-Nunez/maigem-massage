import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Appointment, Service } from '@/types/database'

const BUSINESS_TIMEZONE = 'America/Chicago'

type AppointmentWithService = Appointment & {
  service: Service | null
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !client) {
    notFound()
  }

  const { data: appointmentsData } = await supabase
    .from('appointments')
    .select(`*, service:services(*)`)
    .eq('client_id', id)
    .order('start_datetime', { ascending: false })

  const appointments = (appointmentsData || []) as AppointmentWithService[]

  const completedCount = appointments.filter((a) => a.status === 'completed').length
  const upcomingCount = appointments.filter(
    (a) => a.status === 'confirmed' && new Date(a.start_datetime) > new Date()
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
          {client.first_name?.[0]}
          {client.last_name?.[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {client.first_name} {client.last_name}
          </h1>
          <div className="flex gap-4 mt-2 text-text-muted">
            <a href={`mailto:${client.email}`} className="hover:text-primary">
              {client.email}
            </a>
            <span>•</span>
            <a href={`tel:${client.phone}`} className="hover:text-primary">
              {client.phone}
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <p className="text-text-muted text-sm">Total Appointments</p>
          <p className="text-3xl font-bold text-primary mt-1">
            {appointments.length}
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-text-muted text-sm">Completed</p>
          <p className="text-3xl font-bold text-primary mt-1">{completedCount}</p>
        </Card>
        <Card className="p-6">
          <p className="text-text-muted text-sm">Upcoming</p>
          <p className="text-3xl font-bold text-primary mt-1">{upcomingCount}</p>
        </Card>
      </div>

      {/* Appointment History */}
      <Card className="p-6">
        <h2 className="text-xl font-bold text-foreground mb-6">Appointment History</h2>

        {appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const startDate = toZonedTime(
                new Date(appointment.start_datetime),
                BUSINESS_TIMEZONE
              )
              const isPast = new Date(appointment.start_datetime) < new Date()

              return (
                <div
                  key={appointment.id}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    isPast ? 'bg-secondary/10' : 'bg-primary/5'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-foreground">
                      {appointment.service?.name}
                    </p>
                    <p className="text-sm text-text-muted">
                      {format(startDate, 'EEEE, MMMM d, yyyy')} at{' '}
                      {format(startDate, 'h:mm a')}
                    </p>
                  </div>
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
