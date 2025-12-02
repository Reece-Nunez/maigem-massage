'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AppointmentActionsProps {
  appointmentId: string
  currentStatus: string
  clientEmail?: string
  clientPhone?: string
}

export function AppointmentActions({
  appointmentId,
  currentStatus,
  clientEmail,
  clientPhone,
}: AppointmentActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setLoading(false)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-secondary/30 rounded-lg transition-colors"
        disabled={loading}
      >
        <svg className="w-5 h-5 text-text-muted" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-secondary/30 py-1 z-10">
          {currentStatus !== 'completed' && currentStatus !== 'cancelled' && (
            <button
              onClick={() => updateStatus('completed')}
              className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/20 transition-colors"
            >
              Mark as Completed
            </button>
          )}
          {currentStatus !== 'cancelled' && (
            <button
              onClick={() => updateStatus('cancelled')}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              Cancel Appointment
            </button>
          )}
          {currentStatus === 'cancelled' && (
            <button
              onClick={() => updateStatus('confirmed')}
              className="w-full text-left px-4 py-2 text-sm hover:bg-secondary/20 transition-colors"
            >
              Restore Appointment
            </button>
          )}
          <hr className="my-1 border-secondary/30" />
          {clientEmail && (
            <a
              href={`mailto:${clientEmail}`}
              className="block px-4 py-2 text-sm hover:bg-secondary/20 transition-colors"
            >
              Email Client
            </a>
          )}
          {clientPhone && (
            <a
              href={`tel:${clientPhone}`}
              className="block px-4 py-2 text-sm hover:bg-secondary/20 transition-colors"
            >
              Call Client
            </a>
          )}
        </div>
      )}
    </div>
  )
}
