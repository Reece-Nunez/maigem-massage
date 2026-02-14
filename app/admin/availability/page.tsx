import { Card } from '@/components/ui/card'
import Link from 'next/link'

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

export default async function AvailabilityPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Availability</h1>
      <p className="text-text-muted mb-8">
        Your availability schedule is managed through Square.
      </p>

      <Card className="p-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Managed in Square
          </h2>
          <p className="text-text-muted max-w-md mx-auto mb-6">
            Your availability and business hours are synced from Square. To update your schedule,
            make changes in your Square Dashboard and they will be reflected on the booking page automatically.
          </p>
          <a
            href="https://squareup.com/dashboard/appointments/settings"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Open Square Dashboard
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </Card>

      <Card className="p-6 mt-6">
        <h3 className="font-bold text-foreground mb-4">Need to block time off?</h3>
        <p className="text-text-muted text-sm mb-4">
          You can still block specific times off from the website. These blocked times will
          prevent bookings during those periods.
        </p>
        <Link
          href="/admin/blocked-times"
          className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/30 text-foreground rounded-lg hover:bg-secondary/50 transition-colors text-sm font-medium"
        >
          Manage Blocked Times →
        </Link>
      </Card>
    </div>
  )
}
