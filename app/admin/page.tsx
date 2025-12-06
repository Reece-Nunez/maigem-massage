import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import Link from 'next/link'
import { PendingAppointmentActions } from './pending-actions'
import type { Appointment, Client, Service } from '@/types/database'

const BUSINESS_TIMEZONE = 'America/Chicago'

type AppointmentWithRelations = Appointment & {
  client: Client | null
  service: Service | null
}

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
    { count: pendingCount },
    { data: pendingData },
    { data: upcomingData },
  ] = await Promise.all([
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('start_datetime', todayStart.toISOString())
      .lte('start_datetime', todayEnd.toISOString())
      .eq('status', 'confirmed'),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('start_datetime', weekStart.toISOString())
      .lte('start_datetime', weekEnd.toISOString())
      .eq('status', 'confirmed'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10),
    supabase
      .from('appointments')
      .select(`*, client:clients(*), service:services(*)`)
      .gte('start_datetime', now.toISOString())
      .eq('status', 'confirmed')
      .order('start_datetime', { ascending: true })
      .limit(5),
  ])

  const pendingAppointments = (pendingData || []) as AppointmentWithRelations[]
  const upcomingAppointments = (upcomingData || []) as AppointmentWithRelations[]

  const stats = [
    { label: 'Pending Requests', value: pendingCount || 0, highlight: (pendingCount || 0) > 0 },
    { label: "Today's Confirmed", value: todayCount || 0 },
    { label: 'This Week', value: weekCount || 0 },
    { label: 'Total Clients', value: totalClients || 0 },
  ]

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-6 sm:mb-8">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className={`p-3 sm:p-6 ${stat.highlight ? 'border-2 border-yellow-500 bg-yellow-50' : ''}`}>
            <p className="text-text-muted text-xs sm:text-sm">{stat.label}</p>
            <p className={`text-2xl sm:text-4xl font-bold mt-1 sm:mt-2 ${stat.highlight ? 'text-yellow-600' : 'text-primary'}`}>
              {stat.value}
            </p>
          </Card>
        ))}
      </div>

      {/* Pending Appointments - Show prominently if any */}
      {pendingAppointments && pendingAppointments.length > 0 && (
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8 border-2 border-yellow-500 bg-yellow-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-4 sm:mb-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-xl sm:text-2xl">⏳</span>
              <h2 className="text-lg sm:text-xl font-bold text-foreground">Pending</h2>
              <span className="px-2 py-0.5 sm:py-1 bg-yellow-500 text-white text-xs sm:text-sm rounded-full">
                {pendingAppointments.length}
              </span>
            </div>
            <Link
              href="/admin/appointments?filter=pending"
              className="text-primary hover:underline text-sm"
            >
              View All →
            </Link>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {pendingAppointments.map((appointment) => {
              const startDate = toZonedTime(
                new Date(appointment.start_datetime),
                BUSINESS_TIMEZONE
              )

              return (
                <div
                  key={appointment.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-white rounded-lg shadow-sm"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-yellow-500 flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0">
                      {appointment.client?.first_name?.[0]}
                      {appointment.client?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {appointment.client?.first_name} {appointment.client?.last_name}
                      </p>
                      <p className="text-xs sm:text-sm text-text-muted">
                        {appointment.service?.name} • {format(startDate, 'MMM d')} at {format(startDate, 'h:mm a')}
                      </p>
                      <p className="text-xs text-text-muted truncate hidden sm:block">
                        {appointment.client?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end sm:flex-shrink-0">
                    <PendingAppointmentActions
                      appointmentId={appointment.id}
                      token={appointment.cancellation_token}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Upcoming Confirmed Appointments */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Upcoming</h2>
          <Link
            href="/admin/appointments"
            className="text-primary hover:underline text-sm"
          >
            View All →
          </Link>
        </div>

        {upcomingAppointments && upcomingAppointments.length > 0 ? (
          <div className="space-y-3 sm:space-y-4">
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
                  className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-secondary/20 rounded-lg"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base flex-shrink-0 ${
                        isToday ? 'bg-primary' : 'bg-secondary'
                      }`}
                    >
                      {appointment.client?.first_name?.[0]}
                      {appointment.client?.last_name?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {appointment.client?.first_name} {appointment.client?.last_name}
                      </p>
                      <p className="text-xs sm:text-sm text-text-muted truncate">
                        {appointment.service?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-foreground text-sm sm:text-base">
                      {isToday ? 'Today' : format(startDate, 'MMM d')}
                    </p>
                    <p className="text-xs sm:text-sm text-text-muted">
                      {format(startDate, 'h:mm a')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-text-muted text-center py-6 sm:py-8 text-sm sm:text-base">
            No upcoming confirmed appointments
          </p>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 mt-6 sm:mt-8">
        <Card className="p-4 sm:p-6">
          <h3 className="font-bold text-foreground mb-3 sm:mb-4 text-sm sm:text-base">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/admin/blocked-times"
              className="block p-3 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition-colors"
            >
              <p className="font-medium text-foreground text-sm">Block Time Off</p>
              <p className="text-xs text-text-muted hidden sm:block">
                Mark times as unavailable
              </p>
            </Link>
            <Link
              href="/admin/availability"
              className="block p-3 bg-secondary/20 rounded-lg hover:bg-secondary/40 transition-colors"
            >
              <p className="font-medium text-foreground text-sm">Update Hours</p>
              <p className="text-xs text-text-muted hidden sm:block">
                Change your availability
              </p>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
