'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { AppointmentWithDetails } from '@/types/database'

export default function BookingSuccessPage() {
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

  const getGoogleCalendarUrl = () => {
    if (!appointment) return '#'

    const startDate = new Date(appointment.start_datetime)
    const endDate = new Date(appointment.end_datetime)

    const formatGoogleDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'")

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${appointment.service.name} - MaiGem Massage`,
      dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
      details: `Your ${appointment.service.name} appointment with Crystal Warren at MaiGem Massage.\n\nDuration: ${appointment.service.duration_minutes} minutes\nPrice: ${appointment.service.price_display || 'Price Varies'}\n\nPayment accepted: Cash, Card, Venmo (@lenaecrys)`,
      location: 'Om Yoga Wellness Building, 205 E Chestnut Ave, Ponca City, OK 74604',
      ctz: 'America/Chicago'
    })

    return `https://calendar.google.com/calendar/render?${params.toString()}`
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

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Success Message */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
          <p className="text-text-muted">
            Your appointment has been scheduled. A confirmation email has been sent to {appointment.client.email}.
          </p>
        </div>

        {/* Appointment Details */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-6">Appointment Details</h2>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-text-muted">Service</span>
              <span className="font-medium">{appointment.service.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Date</span>
              <span className="font-medium">
                {format(new Date(appointment.start_datetime), 'EEEE, MMMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Time</span>
              <span className="font-medium">{formatTimeSlot(appointment.start_datetime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Duration</span>
              <span className="font-medium">{appointment.service.duration_minutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">Price</span>
              <span className="font-medium text-primary">{appointment.service.price_display}</span>
            </div>

            <hr className="border-secondary/50" />

            <div>
              <span className="text-text-muted text-sm">Location</span>
              <p className="font-medium">Om Yoga Wellness Building</p>
              <p className="text-sm text-text-muted">205 E Chestnut Ave</p>
              <p className="text-sm text-text-muted">Ponca City, OK 74604</p>
            </div>
          </div>
        </Card>

        {/* Add to Calendar */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Add to Your Calendar</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href={getGoogleCalendarUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm6.24 7.51h-1.88v8.98h-8.72V7.51H5.76v10.74h12.48V7.51zM8.88 6.02V3.28h6.24v2.74H8.88z"/>
                </svg>
                Google Calendar
              </Button>
            </a>
            <a
              href={`/api/calendar/ics/${appointment.id}`}
              download={`maigem-massage-${format(new Date(appointment.start_datetime), 'yyyy-MM-dd')}.ics`}
              className="flex-1"
            >
              <Button variant="outline" className="w-full">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Apple Calendar
              </Button>
            </a>
          </div>
        </Card>

        {/* Payment Info */}
        <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
          <h2 className="text-lg font-semibold text-foreground mb-2">Payment Information</h2>
          <p className="text-text-muted mb-4">
            Payment is collected at your appointment. We accept:
          </p>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Cash
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Credit/Debit Card (including Apple Pay, Google Pay, Samsung Pay)
            </li>
            <li className="flex items-center gap-2">
              <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Venmo: <span className="font-medium">@lenaecrys</span>
            </li>
          </ul>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button variant="outline">Return Home</Button>
          </Link>
          <a href="tel:+15803049861">
            <Button>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Questions? Call Us
            </Button>
          </a>
        </div>
      </main>
    </div>
  )
}
