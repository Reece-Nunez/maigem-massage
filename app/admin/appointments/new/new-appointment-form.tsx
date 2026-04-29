'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { createAdminAppointment } from './actions'
import type { AdminCustomer } from '@/lib/square/admin'
import type { SquareService } from '@/lib/square/types'

interface Props {
  services: SquareService[]
  customers: AdminCustomer[]
}

export function NewAppointmentForm({ services, customers }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [serviceId, setServiceId] = useState(services[0]?.id || '')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [time, setTime] = useState('10:00')
  const [notes, setNotes] = useState('')

  // Customer selection
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(
    null
  )
  const [creatingNew, setCreatingNew] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return []
    return customers
      .filter((c) => {
        const name = `${c.firstName} ${c.lastName}`.toLowerCase()
        return (
          name.includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [customers, customerSearch])

  function pickCustomer(c: AdminCustomer) {
    setSelectedCustomer(c)
    setCreatingNew(false)
    setFirstName(c.firstName)
    setLastName(c.lastName)
    setEmail(c.email || '')
    setPhone(c.phone || '')
    setCustomerSearch('')
  }

  function startCreateNew() {
    setSelectedCustomer(null)
    setCreatingNew(true)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
    setCustomerSearch('')
  }

  function clearCustomer() {
    setSelectedCustomer(null)
    setCreatingNew(false)
    setFirstName('')
    setLastName('')
    setEmail('')
    setPhone('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!serviceId) return setError('Pick a service')
    if (!date) return setError('Pick a date')
    if (!time) return setError('Pick a time')
    if (!firstName || !lastName || !email || !phone) {
      return setError('Customer name, email, and phone are all required')
    }

    const formData = new FormData()
    formData.set('service_id', serviceId)
    formData.set('date', date)
    formData.set('time', time)
    formData.set('first_name', firstName)
    formData.set('last_name', lastName)
    formData.set('email', email)
    formData.set('phone', phone)
    formData.set('notes', notes)

    startTransition(async () => {
      const result = await createAdminAppointment(formData)
      if (!result.ok) {
        setError(result.error || 'Failed to create appointment')
        return
      }
      if (result.error) {
        // Partial success — booking made but local mirror failed
        setError(result.error)
      }
      router.push('/admin/appointments')
      router.refresh()
    })
  }

  const selectedService = services.find((s) => s.id === serviceId)
  const customerLocked = !!selectedCustomer

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Service */}
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

      {/* Date + Time */}
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

      {/* Customer */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-bold text-foreground">Customer</h2>
          {(selectedCustomer || creatingNew) && (
            <button
              type="button"
              onClick={clearCustomer}
              className="text-sm text-text-muted hover:text-foreground"
            >
              Change
            </button>
          )}
        </div>

        {!selectedCustomer && !creatingNew && (
          <div>
            <Input
              type="search"
              placeholder="Search existing customers by name, email, phone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />
            {filteredCustomers.length > 0 && (
              <div className="mt-2 border border-secondary/40 rounded-xl bg-white divide-y divide-secondary/20 overflow-hidden">
                {filteredCustomers.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => pickCustomer(c)}
                    className="block w-full text-left px-4 py-3 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="font-medium text-foreground text-sm">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-text-muted">
                      {c.email || c.phone || '—'}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={startCreateNew}
              className="mt-3 text-sm text-primary hover:underline"
            >
              + Add a new customer instead
            </button>
          </div>
        )}

        {(selectedCustomer || creatingNew) && (
          <div>
            {selectedCustomer && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/30 rounded-xl text-sm">
                <span className="font-medium text-foreground">
                  Existing customer:
                </span>{' '}
                {selectedCustomer.firstName} {selectedCustomer.lastName}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={customerLocked}
                required
              />
              <Input
                label="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={customerLocked}
                required
              />
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={customerLocked}
                required
              />
              <Input
                type="tel"
                label="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={customerLocked}
                required
              />
            </div>
          </div>
        )}
      </Card>

      {/* Notes */}
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          type="submit"
          loading={pending}
          disabled={pending || (!selectedCustomer && !creatingNew)}
          className="flex-1"
        >
          Create Appointment
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
