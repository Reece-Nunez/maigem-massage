'use client'

import { useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { refreshSquareData } from '@/app/admin/actions'

interface Props {
  label?: string
  className?: string
}

export function RefreshSquareButton({ label = 'Refresh from Square', className = '' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, startTransition] = useTransition()
  const [justRefreshed, setJustRefreshed] = useState(false)

  function handleClick() {
    startTransition(async () => {
      await refreshSquareData(pathname)
      router.refresh()
      setJustRefreshed(true)
      setTimeout(() => setJustRefreshed(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border border-secondary/60 text-foreground hover:bg-secondary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      title="Pull the latest bookings, customers, and payments from Square"
    >
      <svg
        className={`w-4 h-4 ${pending ? 'animate-spin' : ''}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {pending ? 'Refreshing...' : justRefreshed ? 'Refreshed!' : label}
    </button>
  )
}
