'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { AppointmentWithDetails } from '@/types/database'

function BookingSuccessContent() {
  const searchParams = useSearchParams()
  const appointmentId = searchParams.get('id')
  const [appointment, setAppointment] = useState<AppointmentWithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (appointmentId) {
      fetch(`/api/appointments/${appointmentId}`)
        .then(res => res.json())
        .then(data => {
          setAppointment(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Failed to fetch appointment:', err)
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [appointmentId])

  const formatTimeSlot = (datetime: string) => {
    const date = new Date(datetime)
    return format(date, 'h:mm a')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!appointment) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Appointment Not Found</h1>
          <p className="text-text-muted mb-6">We couldn&apos;t find this appointment.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    )
  }

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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Request Received Message */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Request Received!</h1>
          <p className="text-text-muted text-sm sm:text-base px-2">
            Your appointment request has been submitted and is awaiting approval.
          </p>
        </div>

        {/* Status Info */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-base sm:text-xl">⏳</span>
            </div>
            <div>
              <h2 className="font-semibold text-foreground mb-2 text-sm sm:text-base">What happens next?</h2>
              <ol className="text-xs sm:text-sm text-text-muted space-y-1.5 sm:space-y-2 list-decimal list-inside">
                <li>We&apos;ve sent you a confirmation email that your request was received</li>
                <li>Crystal will review your request and respond shortly</li>
                <li>Once approved, you&apos;ll receive a confirmation email with calendar links</li>
                <li>If the time doesn&apos;t work, you&apos;ll be notified to choose another time</li>
              </ol>
            </div>
          </div>
        </Card>

        {/* Appointment Details */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6">Requested Appointment</h2>

          <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Service</span>
              <span className="font-medium text-right">{appointment.service.name}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Date</span>
              <span className="font-medium text-right">
                {format(new Date(appointment.start_datetime), 'EEE, MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Time</span>
              <span className="font-medium">{formatTimeSlot(appointment.start_datetime)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Duration</span>
              <span className="font-medium">{appointment.service.duration_minutes} min</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-text-muted">Price</span>
              <span className="font-medium text-primary">{appointment.service.price_display}</span>
            </div>

            <hr className="border-secondary/50" />

            <div className="flex justify-between items-center gap-2">
              <span className="text-text-muted">Status</span>
              <span className="px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs sm:text-sm font-medium">
                Pending Approval
              </span>
            </div>

            <hr className="border-secondary/50" />

            <div>
              <span className="text-text-muted text-xs sm:text-sm">Location</span>
              <p className="font-medium text-sm sm:text-base">Om Yoga Wellness Building</p>
              <p className="text-xs sm:text-sm text-text-muted">205 E Chestnut Ave</p>
              <p className="text-xs sm:text-sm text-text-muted">Ponca City, OK 74604</p>
            </div>
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8 bg-primary/5 border-primary/20">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2">Payment Information</h2>
          {appointment.payment_status === 'paid' ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-700 text-sm sm:text-base">Payment Received</p>
                <p className="text-text-muted text-xs sm:text-sm">
                  {appointment.service.price_display} paid online via card
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-text-muted mb-3 sm:mb-4 text-xs sm:text-sm">
                Payment is collected at your appointment. We accept:
              </p>
              <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Cash
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>Credit/Debit Card (Apple Pay, Google Pay)</span>
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Venmo: <span className="font-medium">@lenaecrys</span>
                </li>
              </ul>
            </>
          )}
        </Card>

        {/* Contact Info */}
        <Card className="p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-semibold text-foreground mb-2">Questions?</h2>
          <p className="text-text-muted mb-3 sm:mb-4 text-xs sm:text-sm">
            If you have any questions about your booking request, feel free to reach out:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a href="tel:+15803049861" className="flex-1">
              <Button variant="outline" className="w-full">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                (580) 304-9861
              </Button>
            </a>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-center">
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-text-muted">Loading...</p>
      </div>
    </div>
  )
}

export default function BookingSuccessPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BookingSuccessContent />
    </Suspense>
  )
}
