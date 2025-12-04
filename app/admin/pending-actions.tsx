'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PendingAppointmentActionsProps {
  appointmentId: string
  token: string | null
}

export function PendingAppointmentActions({
  appointmentId,
  token,
}: PendingAppointmentActionsProps) {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null)
  const router = useRouter()

  const handleAction = async (action: 'accept' | 'reject') => {
    setLoading(action)
    try {
      const response = await fetch(
        `/api/appointments/${appointmentId}/respond?action=${action}&token=${token}`
      )
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to process:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleAction('accept')}
        disabled={loading !== null}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm font-medium"
      >
        {loading === 'accept' ? '...' : '✓ Accept'}
      </button>
      <button
        onClick={() => handleAction('reject')}
        disabled={loading !== null}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
      >
        {loading === 'reject' ? '...' : '✗ Reject'}
      </button>
    </div>
  )
}
