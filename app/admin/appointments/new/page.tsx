import Link from 'next/link'
import { getSquareServices } from '@/lib/square/services'
import { getSquareCustomers } from '@/lib/square/admin'
import { NewAppointmentForm } from './new-appointment-form'

export const dynamic = 'force-dynamic'

export default async function NewAppointmentPage() {
  const [services, customers] = await Promise.all([
    getSquareServices(),
    getSquareCustomers(),
  ])

  return (
    <div>
      <Link
        href="/admin/appointments"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-4"
      >
        ← Back to Appointments
      </Link>

      <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
        New Appointment
      </h1>
      <p className="text-text-muted text-sm mb-6">
        Create a confirmed booking — syncs to Square automatically.
      </p>

      <NewAppointmentForm services={services} customers={customers} />
    </div>
  )
}
