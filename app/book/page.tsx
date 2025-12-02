'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, addDays, parseISO, startOfDay } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import type { Service } from '@/types/database'

type BookingStep = 'service' | 'datetime' | 'contact' | 'confirm'

interface TimeSlot {
  time: string
  available: boolean
}

interface ClientInfo {
  first_name: string
  last_name: string
  email: string
  phone: string
  notes: string
}

export default function BookingPage() {
  const router = useRouter()
  const [step, setStep] = useState<BookingStep>('service')
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Generate next 60 days for date selection
  const availableDates = Array.from({ length: 60 }, (_, i) => addDays(new Date(), i + 1))

  // Fetch services on mount
  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error('Failed to fetch services:', err))
  }, [])

  // Fetch available slots when date changes
  useEffect(() => {
    if (selectedDate && selectedService) {
      setSlotsLoading(true)
      setSelectedTime(null)
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      fetch(`/api/appointments/available-slots?date=${dateStr}&service_id=${selectedService.id}`)
        .then(res => res.json())
        .then(data => {
          setAvailableSlots(data.slots || [])
          setSlotsLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch slots:', err)
          setSlotsLoading(false)
        })
    }
  }, [selectedDate, selectedService])

  const formatTimeSlot = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const period = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
  }

  const handleSubmit = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_id: selectedService.id,
          date: format(selectedDate, 'yyyy-MM-dd'),
          time: selectedTime,
          client: {
            first_name: clientInfo.first_name,
            last_name: clientInfo.last_name,
            email: clientInfo.email,
            phone: clientInfo.phone,
          },
          notes: clientInfo.notes,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book appointment')
      }

      // Redirect to success page with appointment ID
      router.push(`/book/success?id=${data.appointment.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const canProceed = () => {
    switch (step) {
      case 'service':
        return selectedService !== null
      case 'datetime':
        return selectedDate !== null && selectedTime !== null
      case 'contact':
        return (
          clientInfo.first_name.trim() !== '' &&
          clientInfo.last_name.trim() !== '' &&
          clientInfo.email.trim() !== '' &&
          clientInfo.phone.trim() !== ''
        )
      case 'confirm':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (step === 'service') setStep('datetime')
    else if (step === 'datetime') setStep('contact')
    else if (step === 'contact') setStep('confirm')
  }

  const prevStep = () => {
    if (step === 'datetime') setStep('service')
    else if (step === 'contact') setStep('datetime')
    else if (step === 'confirm') setStep('contact')
  }

  const steps = ['service', 'datetime', 'contact', 'confirm']
  const currentStepIndex = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-secondary/50">
        <nav className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/maigem-logo.png"
              alt="MaiGem Massage"
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="text-xl font-semibold text-foreground">MaiGem Massage</span>
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    i <= currentStepIndex
                      ? 'bg-primary text-white'
                      : 'bg-secondary/50 text-text-muted'
                  }`}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      i < currentStepIndex ? 'bg-primary' : 'bg-secondary/50'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-text-muted">
            {step === 'service' && 'Choose your service'}
            {step === 'datetime' && 'Select date & time'}
            {step === 'contact' && 'Your information'}
            {step === 'confirm' && 'Confirm booking'}
          </p>
        </div>

        {/* Step Content */}
        <div className="space-y-8">
          {/* Step 1: Service Selection */}
          {step === 'service' && (
            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service) => (
                <Card
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  selected={selectedService?.id === service.id}
                  className="p-6"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-foreground">{service.name}</h3>
                    <div className="text-right">
                      <span className="text-sm text-text-muted">{service.duration_minutes} min</span>
                      <p className="text-lg font-semibold text-primary">{service.price_display}</p>
                    </div>
                  </div>
                  <p className="text-text-muted text-sm">{service.description}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && (
            <div className="space-y-8">
              {/* Date Selection */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Select a Date</h3>
                <div className="flex gap-3 overflow-x-auto pb-4">
                  {availableDates.slice(0, 14).map((date) => {
                    const isSelected = selectedDate && format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                    return (
                      <button
                        key={date.toISOString()}
                        onClick={() => setSelectedDate(date)}
                        className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-secondary/50 hover:border-primary/50'
                        }`}
                      >
                        <p className="text-sm text-text-muted">{format(date, 'EEE')}</p>
                        <p className="text-lg font-semibold">{format(date, 'd')}</p>
                        <p className="text-sm text-text-muted">{format(date, 'MMM')}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Select a Time</h3>
                  {slotsLoading ? (
                    <div className="text-center py-8 text-text-muted">Loading available times...</div>
                  ) : availableSlots.filter(s => s.available).length === 0 ? (
                    <div className="text-center py-8 text-text-muted">
                      No available times for this date. Please select another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {availableSlots
                        .filter((slot) => slot.available)
                        .map((slot) => {
                          const isSelected = selectedTime === slot.time
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`px-4 py-3 rounded-xl border-2 transition-colors ${
                                isSelected
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-secondary/50 hover:border-primary/50'
                              }`}
                            >
                              {formatTimeSlot(slot.time)}
                            </button>
                          )
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Contact Information */}
          {step === 'contact' && (
            <div className="max-w-md mx-auto space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First Name"
                  value={clientInfo.first_name}
                  onChange={(e) => setClientInfo({ ...clientInfo, first_name: e.target.value })}
                  required
                />
                <Input
                  label="Last Name"
                  value={clientInfo.last_name}
                  onChange={(e) => setClientInfo({ ...clientInfo, last_name: e.target.value })}
                  required
                />
              </div>
              <Input
                label="Email"
                type="email"
                value={clientInfo.email}
                onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={clientInfo.phone}
                onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
                placeholder="(580) 555-1234"
                required
              />
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo({ ...clientInfo, notes: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-secondary/50 bg-white text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                  rows={3}
                  placeholder="Any special requests or areas of focus..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 'confirm' && selectedService && selectedDate && selectedTime && (
            <div className="max-w-md mx-auto">
              <Card className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-6">Booking Summary</h3>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Service</span>
                    <span className="font-medium">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Duration</span>
                    <span className="font-medium">{selectedService.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Date</span>
                    <span className="font-medium">{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Time</span>
                    <span className="font-medium">{formatTimeSlot(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Price</span>
                    <span className="font-medium text-primary">{selectedService.price_display}</span>
                  </div>

                  <hr className="border-secondary/50" />

                  <div>
                    <span className="text-text-muted text-sm">Contact</span>
                    <p className="font-medium">{clientInfo.first_name} {clientInfo.last_name}</p>
                    <p className="text-sm text-text-muted">{clientInfo.email}</p>
                    <p className="text-sm text-text-muted">{clientInfo.phone}</p>
                  </div>

                  {clientInfo.notes && (
                    <div>
                      <span className="text-text-muted text-sm">Notes</span>
                      <p className="text-sm">{clientInfo.notes}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 p-4 bg-secondary/20 rounded-xl">
                  <p className="text-sm text-text-muted">
                    <strong>Payment:</strong> Payment is collected at your appointment.
                    We accept cash, card, and Venmo (@lenaecrys).
                  </p>
                </div>

                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                    {error}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-12 flex justify-between">
          <Button
            variant="ghost"
            onClick={step === 'service' ? () => router.push('/') : prevStep}
          >
            {step === 'service' ? 'Cancel' : 'Back'}
          </Button>

          {step === 'confirm' ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              loading={loading}
            >
              Confirm Booking
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()}>
              Continue
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
