'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, addDays, parseISO, startOfDay } from 'date-fns'
import { DayPicker } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { SquarePayment } from './components/SquarePayment'
import type { Service } from '@/types/database'

type BookingStep = 'service' | 'datetime' | 'contact' | 'payment' | 'confirm'

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
  const [paymentMethod, setPaymentMethod] = useState<'pay_at_appointment' | 'pay_online'>('pay_at_appointment')
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [paymentReady, setPaymentReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [nextAvailableLoading, setNextAvailableLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Date range for calendar
  const tomorrow = addDays(new Date(), 1)
  const maxDate = addDays(new Date(), 60)

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

  const handleGoToNextAvailable = async () => {
    if (!selectedService) return
    setNextAvailableLoading(true)
    try {
      const res = await fetch(`/api/appointments/next-available?service_id=${selectedService.id}`)
      const data = await res.json()
      if (data.date) {
        setSelectedDate(parseISO(data.date))
      }
    } catch (err) {
      console.error('Failed to find next available:', err)
    } finally {
      setNextAvailableLoading(false)
    }
  }

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

    // Tokenize card if paying online
    let token = paymentToken
    if (paymentMethod === 'pay_online' && !token) {
      const tokenizeFn = (window as any).__squareTokenize
      if (tokenizeFn) {
        token = await tokenizeFn()
        if (!token) {
          setLoading(false)
          return
        }
      }
    }

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
          payment_method: paymentMethod,
          payment_token: token || undefined,
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
      case 'payment':
        if (paymentMethod === 'pay_at_appointment') return true
        return paymentReady
      case 'confirm':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (step === 'service') setStep('datetime')
    else if (step === 'datetime') setStep('contact')
    else if (step === 'contact') setStep('payment')
    else if (step === 'payment') setStep('confirm')
  }

  const prevStep = () => {
    if (step === 'datetime') setStep('service')
    else if (step === 'contact') setStep('datetime')
    else if (step === 'payment') setStep('contact')
    else if (step === 'confirm') setStep('payment')
  }

  const steps = ['service', 'datetime', 'contact', 'payment', 'confirm']
  const currentStepIndex = steps.indexOf(step)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-secondary/50 sticky top-0 z-10">
        <nav className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/maigem-logo.png"
              alt="MaiGem Massage"
              width={40}
              height={40}
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
            />
            <span className="text-lg sm:text-xl font-semibold text-foreground">MaiGem Massage</span>
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Progress Steps */}
        <div className="mb-6 sm:mb-12">
          <div className="flex items-center justify-center gap-1 sm:gap-2 mb-3 sm:mb-4">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium ${
                    i <= currentStepIndex
                      ? 'bg-primary text-white'
                      : 'bg-secondary/50 text-text-muted'
                  }`}
                >
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`w-6 sm:w-12 h-1 mx-1 sm:mx-2 ${
                      i < currentStepIndex ? 'bg-primary' : 'bg-secondary/50'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-text-muted text-sm sm:text-base">
            {step === 'service' && 'Choose your service'}
            {step === 'datetime' && 'Select date & time'}
            {step === 'contact' && 'Your information'}
            {step === 'payment' && 'Payment method'}
            {step === 'confirm' && 'Confirm booking'}
          </p>
        </div>

        {/* Step Content */}
        <div className="space-y-6 sm:space-y-8">
          {/* Step 1: Service Selection */}
          {step === 'service' && (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
              {services.map((service) => (
                <Card
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  selected={selectedService?.id === service.id}
                  className="p-4 sm:p-6"
                >
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground pr-2">{service.name}</h3>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs sm:text-sm text-text-muted">{service.duration_minutes} min</span>
                      <p className="text-base sm:text-lg font-semibold text-primary">{service.price_display}</p>
                    </div>
                  </div>
                  <p className="text-text-muted text-xs sm:text-sm">{service.description}</p>
                </Card>
              ))}
            </div>
          )}

          {/* Step 2: Date & Time Selection */}
          {step === 'datetime' && (
            <div className="space-y-6 sm:space-y-8">
              {/* Date Selection - Calendar */}
              <div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Select a Date</h3>
                <div className="flex justify-center mb-3">
                  <button
                    onClick={handleGoToNextAvailable}
                    disabled={nextAvailableLoading}
                    className="text-sm text-primary hover:text-primary-dark font-medium transition-colors disabled:opacity-50"
                  >
                    {nextAvailableLoading ? 'Finding...' : 'Go to next available date →'}
                  </button>
                </div>
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={selectedDate ?? undefined}
                    onSelect={(date) => setSelectedDate(date ?? null)}
                    disabled={[
                      { before: tomorrow },
                      { after: maxDate },
                    ]}
                    defaultMonth={tomorrow}
                    classNames={{
                      root: 'bg-white rounded-xl border border-secondary/50 p-4 shadow-sm',
                      months: 'flex flex-col',
                      month_caption: 'flex justify-center items-center mb-2',
                      caption_label: 'text-base font-semibold text-foreground',
                      nav: 'flex items-center gap-1',
                      button_previous: 'p-1.5 rounded-lg hover:bg-secondary/30 text-text-muted',
                      button_next: 'p-1.5 rounded-lg hover:bg-secondary/30 text-text-muted',
                      weekdays: 'flex',
                      weekday: 'w-10 h-10 flex items-center justify-center text-xs font-medium text-text-muted',
                      week: 'flex',
                      day: 'w-10 h-10 flex items-center justify-center',
                      day_button: 'w-9 h-9 rounded-full text-sm font-medium transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50',
                      selected: '[&>button]:bg-primary [&>button]:text-white [&>button]:hover:bg-primary-dark',
                      today: '[&>button]:font-bold [&>button]:text-primary',
                      disabled: '[&>button]:text-secondary [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent [&>button]:hover:text-secondary',
                      outside: '[&>button]:text-secondary/50',
                    }}
                  />
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Select a Time</h3>
                  {slotsLoading ? (
                    <div className="text-center py-6 sm:py-8 text-text-muted text-sm sm:text-base">Loading available times...</div>
                  ) : availableSlots.filter(s => s.available).length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-text-muted text-sm sm:text-base">
                      No available times for this date. Please select another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3">
                      {availableSlots
                        .filter((slot) => slot.available)
                        .map((slot) => {
                          const isSelected = selectedTime === slot.time
                          return (
                            <button
                              key={slot.time}
                              onClick={() => setSelectedTime(slot.time)}
                              className={`px-2 sm:px-4 py-3 rounded-xl border-2 transition-colors text-sm sm:text-base min-h-[48px] ${
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
            <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  className="w-full px-4 py-3 rounded-xl border border-secondary/50 bg-white text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-base min-h-[100px]"
                  rows={3}
                  placeholder="Any special requests or areas of focus..."
                />
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 'payment' && selectedService && (
            <div className="max-w-md mx-auto">
              <SquarePayment
                amountCents={selectedService.price_cents}
                priceDisplay={selectedService.price_display}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={(method) => {
                  setPaymentMethod(method)
                  setPaymentToken(null)
                }}
                onPaymentToken={setPaymentToken}
                onPaymentReady={setPaymentReady}
              />
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 'confirm' && selectedService && selectedDate && selectedTime && (
            <div className="max-w-md mx-auto">
              <Card className="p-4 sm:p-6">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Booking Summary</h3>

                <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
                  <div className="flex justify-between gap-2">
                    <span className="text-text-muted">Service</span>
                    <span className="font-medium text-right">{selectedService.name}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-text-muted">Duration</span>
                    <span className="font-medium">{selectedService.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-text-muted">Date</span>
                    <span className="font-medium text-right">{format(selectedDate, 'EEE, MMM d, yyyy')}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-text-muted">Time</span>
                    <span className="font-medium">{formatTimeSlot(selectedTime)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-text-muted">Price</span>
                    <span className="font-medium text-primary">{selectedService.price_display}</span>
                  </div>

                  <hr className="border-secondary/50" />

                  <div>
                    <span className="text-text-muted text-xs sm:text-sm">Contact</span>
                    <p className="font-medium">{clientInfo.first_name} {clientInfo.last_name}</p>
                    <p className="text-xs sm:text-sm text-text-muted break-all">{clientInfo.email}</p>
                    <p className="text-xs sm:text-sm text-text-muted">{clientInfo.phone}</p>
                  </div>

                  {clientInfo.notes && (
                    <div>
                      <span className="text-text-muted text-xs sm:text-sm">Notes</span>
                      <p className="text-xs sm:text-sm">{clientInfo.notes}</p>
                    </div>
                  )}

                  <hr className="border-secondary/50" />

                  <div>
                    <span className="text-text-muted text-xs sm:text-sm">Payment</span>
                    {paymentMethod === 'pay_online' ? (
                      <p className="text-sm font-medium text-primary">
                        Paying {selectedService.price_display} online
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-text-muted">
                        Payment will be collected at your appointment. We accept cash, card, and Venmo.
                      </p>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-4 p-3 sm:p-4 bg-red-50 text-red-600 rounded-xl text-xs sm:text-sm">
                    {error}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 sm:mt-12 flex justify-between gap-4">
          <Button
            variant="ghost"
            onClick={step === 'service' ? () => router.push('/') : prevStep}
            className="min-h-[48px] px-4 sm:px-6"
          >
            {step === 'service' ? 'Cancel' : 'Back'}
          </Button>

          {step === 'confirm' ? (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || loading}
              loading={loading}
              className="min-h-[48px] px-4 sm:px-6"
            >
              {paymentMethod === 'pay_online' ? 'Pay & Confirm' : 'Confirm Booking'}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={!canProceed()} className="min-h-[48px] px-4 sm:px-6">
              Continue
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
