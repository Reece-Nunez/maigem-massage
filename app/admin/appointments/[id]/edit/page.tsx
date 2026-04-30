import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSquareServices } from '@/lib/square/services'
import { getSquareBookings } from '@/lib/square/admin'
import { EditAppointmentForm } from './edit-form'

const BUSINESS_TIMEZONE = 'America/Chicago'

export const dynamic = 'force-dynamic'

interface ResolvedAppointment {
  appointmentId: string
  squareCustomerId: string | null
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone: string
  serviceId: string | null
  serviceName: string
  date: string // yyyy-MM-dd in Central time
  time: string // HH:mm in Central time
  notes: string
  source: 'supabase' | 'square'
  syncsToSquare: boolean
}

async function resolveAppointment(id: string): Promise<ResolvedAppointment | null> {
  const supabase = createAdminClient()
  const services = await getSquareServices()

  // Try Supabase by uuid id first
  const { data: localById } = await supabase
    .from('appointments')
    .select('*, client:clients(*), service:services(*)')
    .eq('id', id)
    .maybeSingle()

  if (localById) {
    const zoned = toZonedTime(new Date(localById.start_datetime), BUSINESS_TIMEZONE)
    return {
      appointmentId: localById.id,
      squareCustomerId: localById.client?.square_customer_id || null,
      customerFirstName: localById.client?.first_name || '',
      customerLastName: localById.client?.last_name || '',
      customerEmail: localById.client?.email || '',
      customerPhone: localById.client?.phone || '',
      serviceId: localById.service_id,
      serviceName: localById.service?.name || 'Unknown',
      date: format(zoned, 'yyyy-MM-dd'),
      time: format(zoned, 'HH:mm'),
      notes: localById.client_notes || '',
      source: 'supabase',
      syncsToSquare: !!localById.square_booking_id,
    }
  }

  // Try Supabase by square_booking_id (mirrored confirmed booking)
  const { data: localBySquareId } = await supabase
    .from('appointments')
    .select('*, client:clients(*), service:services(*)')
    .eq('square_booking_id', id)
    .maybeSingle()

  if (localBySquareId) {
    const zoned = toZonedTime(new Date(localBySquareId.start_datetime), BUSINESS_TIMEZONE)
    return {
      appointmentId: id, // use the Square ID since that's what the URL uses
      squareCustomerId: localBySquareId.client?.square_customer_id || null,
      customerFirstName: localBySquareId.client?.first_name || '',
      customerLastName: localBySquareId.client?.last_name || '',
      customerEmail: localBySquareId.client?.email || '',
      customerPhone: localBySquareId.client?.phone || '',
      serviceId: localBySquareId.service_id,
      serviceName: localBySquareId.service?.name || 'Unknown',
      date: format(zoned, 'yyyy-MM-dd'),
      time: format(zoned, 'HH:mm'),
      notes: localBySquareId.client_notes || '',
      source: 'supabase',
      syncsToSquare: true,
    }
  }

  // Fall back to Square-only booking (admin created in Square dashboard)
  const squareBookings = await getSquareBookings()
  const squareBooking = squareBookings.find((b) => b.id === id)
  if (!squareBooking) return null

  const zoned = toZonedTime(new Date(squareBooking.startAt), BUSINESS_TIMEZONE)

  // Match the Square service back to one of our SquareService entries
  const matchedService = services.find((s) => s.name === squareBooking.serviceName)

  // Split the Square customer name back into first/last
  const nameParts = squareBooking.customerName.split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  return {
    appointmentId: id,
    squareCustomerId: squareBooking.customerId,
    customerFirstName: firstName,
    customerLastName: lastName,
    customerEmail: squareBooking.customerEmail || '',
    customerPhone: squareBooking.customerPhone || '',
    serviceId: matchedService?.id || null,
    serviceName: squareBooking.serviceName,
    date: format(zoned, 'yyyy-MM-dd'),
    time: format(zoned, 'HH:mm'),
    notes: squareBooking.notes || '',
    source: 'square',
    syncsToSquare: true,
  }
}

export default async function EditAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [services, appointment] = await Promise.all([
    getSquareServices(),
    resolveAppointment(id),
  ])

  if (!appointment) notFound()

  return (
    <div>
      <Link
        href="/admin/appointments"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-4"
      >
        ← Back to Appointments
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
        Edit Appointment
      </h1>
      <p className="text-text-muted text-sm mb-6">
        {appointment.customerFirstName} {appointment.customerLastName} ·{' '}
        {appointment.syncsToSquare ? (
          <span className="text-primary">Will sync to Square</span>
        ) : (
          <span>Local only — sync once accepted</span>
        )}
      </p>

      <EditAppointmentForm
        services={services}
        initial={appointment}
      />
    </div>
  )
}
