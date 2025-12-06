import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { BlockedTimeForm } from './blocked-time-form'
import { DeleteBlockedTime } from './delete-blocked-time'
import type { BlockedTime } from '@/types/database'

const BUSINESS_TIMEZONE = 'America/Chicago'

export default async function BlockedTimesPage() {
  const supabase = await createClient()
  const now = new Date()

  const { data: blockedTimesData } = await supabase
    .from('blocked_times')
    .select('*')
    .gte('end_datetime', now.toISOString())
    .order('start_datetime', { ascending: true })

  const blockedTimes = (blockedTimesData || []) as BlockedTime[]

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Blocked Times</h1>
      <p className="text-text-muted mb-8">
        Block off times when you're unavailable for appointments (vacation, appointments, etc.)
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Add New Block */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Block Time Off</h2>
          <BlockedTimeForm />
        </Card>

        {/* Existing Blocks */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-foreground mb-6">Upcoming Blocked Times</h2>

          {blockedTimes.length > 0 ? (
            <div className="space-y-4">
              {blockedTimes.map((block) => {
                const startDate = toZonedTime(
                  new Date(block.start_datetime),
                  BUSINESS_TIMEZONE
                )
                const endDate = toZonedTime(
                  new Date(block.end_datetime),
                  BUSINESS_TIMEZONE
                )
                const isSameDay =
                  format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')

                return (
                  <div
                    key={block.id}
                    className="flex items-start justify-between p-4 bg-secondary/20 rounded-lg"
                  >
                    <div>
                      {block.reason && (
                        <p className="font-medium text-foreground mb-1">
                          {block.reason}
                        </p>
                      )}
                      <p className="text-sm text-text-muted">
                        {isSameDay ? (
                          <>
                            {format(startDate, 'EEEE, MMMM d, yyyy')}
                            <br />
                            {format(startDate, 'h:mm a')} - {format(endDate, 'h:mm a')}
                          </>
                        ) : (
                          <>
                            {format(startDate, 'MMM d, yyyy h:mm a')}
                            <br />
                            to {format(endDate, 'MMM d, yyyy h:mm a')}
                          </>
                        )}
                      </p>
                    </div>
                    <DeleteBlockedTime id={block.id} />
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-text-muted text-center py-8">
              No blocked times scheduled
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
