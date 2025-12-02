import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, addDays } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'

const BUSINESS_TIMEZONE = 'America/Chicago'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const now = new Date()
  const zonedNow = toZonedTime(now, BUSINESS_TIMEZONE)
  const todayStart = startOfDay(zonedNow)
  const todayEnd = endOfDay(zonedNow)
  const weekStart = startOfWeek(zonedNow, { weekStartsOn: 0 })
  const weekEnd = endOfWeek(zonedNow, { weekStartsOn: 0 })

  // Fetch stats in parallel
  const [
    { count: todayCount },
    { count: weekCount },
    { count: totalClients },
    { data: upcomingAppointments },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('start_datetime', todayStart.toISOString())
      .lte('start_datetime', todayEnd.toISOString())
      .neq('status', 'cancelled'),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('start_datetime', weekStart.toISOString())
      .lte('start_datetime', weekEnd.toISOString())
      .neq('status', 'cancelled'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('appointments')
      .select(`
        *,
        client:clients(*),
        service:services(*)
      `)
      .gte('start_datetime', now.toISOString())
      .neq('status', 'cancelled')
      .order('start_datetime', { ascending: true })
      .limit(5),
  ])

  const stats = [
    { label: "Today's Appointments", value: todayCount || 0 },
    { label: 'This Week', value: weekCount || 0 },
    { label: 'Total Clients', value: totalClients || 0 },
  ]

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6">
            <p className="text-text-muted text-sm">{stat.label}</p>
            <p className="text-4xl font-bold text-primary mt-2">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Upcoming Appointments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Upcoming Appointments</h2>
          <Link
            href="/admin/appointments"
            className="text-primary hover:underline text-sm"
          >
            View All →
          </Link>
        </div>

        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <div className="space-y-4">
            {upcomingAppointments.map((appointment) => {
              const startDate = toZonedTime(
                new Date(appointment.start_datetime),
                BUSINESS_TIMEZONE
              )
              const isToday =
                format(startDate, 'yyyy-MM-dd') ===
                format(zonedNow, 'yyyy-MM-dd')

              return (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        isToday ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      {appointment.client?.first_name?.[0]}
                      {appointment.client?.last_name?.[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {appointment.client?.first_name} {appointment.client?.last_name}
                      </p>
                      <p className="text-sm text-text-muted">
                        {appointment.service?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {isToday ? 'Today' : format(startDate, 'EEE, MMM d')}
                    </p>
                    <p className="text-sm text-text-muted">
                      {format(startDate, 'h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-text-muted text-center py-8">
            No upcoming appointments
          </p>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/admin/blocked-times"
              className="block p-3 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition-colors"
            >
              <p className="font-medium text-foreground">Block Time Off</p>
              <p className="text-sm text-text-muted">
                Mark days or times as unavailable
              </p>
            </Link>
            <Link
              href="/admin/availability"
              className="block p-3 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition-colors"
            >
              <p className="font-medium text-foreground">Update Hours</p>
              <p className="text-sm text-text-muted">
                Change your regular availability
              </p>
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-foreground mb-4">Need Help?</h3>
          <p className="text-text-muted mb-4">
            Managing your massage business has never been easier. Use the
            sidebar to navigate between different sections.
          </p>
          <ul className="text-sm text-text-muted space-y-2">
            <li>
              <strong>Appointments:</strong> View and manage all bookings
            </li>
            <li>
              <strong>Availability:</strong> Set your regular weekly hours
            </li>
            <li>
              <strong>Blocked Times:</strong> Block off vacation or busy days
            </li>
            <li>
              <strong>Clients:</strong> View your client list and history
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
