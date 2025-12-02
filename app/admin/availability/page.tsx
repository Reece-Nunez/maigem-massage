import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { AvailabilityEditor } from './availability-editor'

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export default async function AvailabilityPage() {
  const supabase = await createClient()

  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .order('day_of_week')

  // Create a map of availability by day
  const availabilityByDay = DAYS_OF_WEEK.map((day) => {
    const dayAvailability = availability?.find((a) => a.day_of_week === day.value)
    // Strip seconds from time if present (database returns HH:mm:ss, we need HH:mm)
    const startTime = dayAvailability?.start_time?.slice(0, 5) ?? '09:00'
    const endTime = dayAvailability?.end_time?.slice(0, 5) ?? '17:00'
    return {
      ...day,
      is_active: dayAvailability?.is_active ?? false,
      start_time: startTime,
      end_time: endTime,
      id: dayAvailability?.id,
    }
  })

  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Availability</h1>
      <p className="text-text-muted mb-8">
        Set your regular weekly hours. Clients can only book during these times.
      </p>

      <Card className="p-6">
        <AvailabilityEditor initialAvailability={availabilityByDay} />
      </Card>
    </div>
  )
}
