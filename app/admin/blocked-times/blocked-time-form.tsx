'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function BlockedTimeForm() {
  const [blockType, setBlockType] = useState<'full-day' | 'time-range'>('full-day')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/blocked-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          block_type: blockType,
          start_date: startDate,
          end_date: endDate || startDate,
          start_time: blockType === 'time-range' ? startTime : '00:00',
          end_time: blockType === 'time-range' ? endTime : '23:59',
          reason,
        }),
      })

      if (response.ok) {
        setMessage({ type: 'success', text: 'Time blocked successfully!' })
        setStartDate('')
        setEndDate('')
        setReason('')
        router.refresh()
      } else {
        const data = await response.json()
        setMessage({ type: 'error', text: data.error || 'Failed to block time' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const timeOptions = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
      const ampm = hour >= 12 ? 'PM' : 'AM'
      const display = `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`
      timeOptions.push({ value: time, label: display })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Block Type */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="blockType"
            checked={blockType === 'full-day'}
            onChange={() => setBlockType('full-day')}
            className="w-4 h-4 text-primary"
          />
          <span className="text-foreground">Full Day(s)</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="blockType"
            checked={blockType === 'time-range'}
            onChange={() => setBlockType('time-range')}
            className="w-4 h-4 text-primary"
          />
          <span className="text-foreground">Specific Times</span>
        </label>
      </div>

      {/* Date Selection */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label={blockType === 'full-day' ? 'Start Date' : 'Date'}
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
        />
        {blockType === 'full-day' && (
          <Input
            label="End Date (optional)"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
          />
        )}
      </div>

      {/* Time Selection */}
      {blockType === 'time-range' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Start Time
            </label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-3 border border-secondary/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              End Time
            </label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-4 py-3 border border-secondary/50 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {timeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Reason */}
      <Input
        label="Reason (optional)"
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g., Vacation, Personal appointment"
      />

      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" loading={saving} className="w-full">
        Block Time
      </Button>
    </form>
  )
}
