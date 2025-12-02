'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface DayAvailability {
  value: number
  label: string
  is_available: boolean
  start_time: string
  end_time: string
  id?: string
}

interface AvailabilityEditorProps {
  initialAvailability: DayAvailability[]
}

export function AvailabilityEditor({ initialAvailability }: AvailabilityEditorProps) {
  const [availability, setAvailability] = useState(initialAvailability)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const updateDay = (dayValue: number, updates: Partial<DayAvailability>) => {
    setAvailability((prev) =>
      prev.map((day) =>
        day.value === dayValue ? { ...day, ...updates } : day
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/availability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availability }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Availability updated successfully!' })
        router.refresh()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to update availability' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const timeOptions = []
  for (let hour = 6; hour <= 21; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const display = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
      timeOptions.push({ value: time, label: display })
    }
  }

  return (
    <div>
      <div className="space-y-4">
        {availability.map((day) => (
          <div
            key={day.value}
            className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
              day.is_available ? 'bg-primary/5' : 'bg-secondary/20'
            }`}
          >
            <label className="flex items-center gap-3 w-32">
              <input
                type="checkbox"
                checked={day.is_available}
                onChange={(e) => updateDay(day.value, { is_available: e.target.checked })}
                className="w-5 h-5 rounded border-secondary text-primary focus:ring-primary"
              />
              <span className="font-medium text-foreground">{day.label}</span>
            </label>

            {day.is_available && (
              <div className="flex items-center gap-2 flex-1">
                <select
                  value={day.start_time}
                  onChange={(e) => updateDay(day.value, { start_time: e.target.value })}
                  className="px-3 py-2 border border-secondary/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-text-muted">to</span>
                <select
                  value={day.end_time}
                  onChange={(e) => updateDay(day.value, { end_time: e.target.value })}
                  className="px-3 py-2 border border-secondary/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {timeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!day.is_available && (
              <span className="text-text-muted text-sm">Closed</span>
            )}
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`mt-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}
