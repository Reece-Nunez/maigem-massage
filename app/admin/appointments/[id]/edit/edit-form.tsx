'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { updateAdminAppointment } from './actions'
import type { SquareService } from '@/lib/square/types'

interface InitialAppointment {
  appointmentId: string
  squareCustomerId: string | null
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerPhone: string
  serviceId: string | null
  serviceName: string
  date: string
  time: string
  notes: string
}

interface Props {
  services: SquareService[]
  initial: InitialAppointment
}

export function EditAppointmentForm({ services, initial }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const [serviceId, setServiceId] = useState(
    initial.serviceId || services[0]?.id || ''
  )
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time)
  const [notes, setNotes] = useState(initial.notes)
  const [firstName, setFirstName] = useState(initial.customerFirstName)
  const [lastName, setLastName] = useState(initial.customerLastName)
  const [email, setEmail] = useState(initial.customerEmail)
  const [phone, setPhone] = useState(initial.customerPhone)

  const selectedService = services.find((s) => s.id === serviceId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!serviceId) return setError('Pick a service')
    if (!date || !time) return setError('Date and time required')
    if (!firstName || !lastName || !email || !phone) {
      return setError('Customer name, email, and phone are required')
    }

    const formData = new FormData()
    formData.set('appointmentId', initial.appointmentId)
    formData.set('service_id', serviceId)
    formData.set('date', date)
    formData.set('time', time)
    formData.set('notes', notes)
    formData.set('first_name', firstName)
    formData.set('last_name', lastName)
    formData.set('email', email)
    formData.set('phone', phone)
    if (initial.squareCustomerId) {
      formData.set('square_customer_id', initial.squareCustomerId)
    }

    startTransition(async () => {
      const result = await updateAdminAppointment(formData)
      if (!result.ok) {
        setError(result.error || 'Failed to update appointment')
        return
      }
      if (result.warning) {
        // Saved locally but Square wasn't updated — show inline so admin sees it.
        setWarning(result.warning)
        return
      }
      router.push('/admin/appointments')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Customer</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="tel"
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <p className="text-xs text-text-muted mt-3">
          Changes to name, email, or phone will update the customer record in Square.
        </p>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Service</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {services.map((s) => {
            const isSelected = s.id === serviceId
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => setServiceId(s.id)}
                className={`text-left p-4 rounded-xl border-2 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-secondary/40 hover:border-secondary'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground text-sm sm:text-base">
                    {s.name}
                  </span>
                  <span className="text-primary font-semibold text-sm whitespace-nowrap">
                    {s.price_display}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {s.duration_minutes} min
                </p>
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="p-4 sm:p-6">
        <h2 className="text-lg font-bold text-foreground mb-4">Date & Time</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="date"
            label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          <Input
            type="time"
            label="Time (Central)"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>
        {selectedService && (
          <p className="text-xs text-text-muted mt-3">
            {selectedService.duration_minutes}-minute appointment
          </p>
        )}
      </Card>

      <Card className="p-4 sm:p-6">
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Notes <span className="text-text-muted font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes about the appointment..."
          className="w-full px-4 py-3 rounded-xl border border-secondary/50 bg-white text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
        />
      </Card>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {warning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900">
          <p className="font-semibold mb-1">Saved locally</p>
          <p>{warning}</p>
          <button
            type="button"
            onClick={() => router.push('/admin/appointments')}
            className="mt-2 text-amber-700 underline hover:text-amber-900"
          >
            Back to appointments
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          loading={pending}
          disabled={pending}
          className="flex-1"
        >
          Save Changes
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin/appointments')}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
