'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { deleteDuplicateCustomer } from './actions'
import type { DuplicateCustomer } from './page'

interface Props {
  matchType: 'email' | 'phone' | 'name'
  matchLabel: string
  customers: DuplicateCustomer[]
}

const TYPE_LABEL: Record<Props['matchType'], string> = {
  email: 'Same email',
  phone: 'Same phone',
  name: 'Same name',
}

export function DuplicateGroup({ matchType, matchLabel, customers }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  function handleDelete(id: string) {
    setError(null)
    setPendingId(id)
    startTransition(async () => {
      const result = await deleteDuplicateCustomer(id)
      if (!result.ok) {
        setError(result.error || 'Failed to delete')
        setPendingId(null)
        return
      }
      setPendingId(null)
      setConfirmingId(null)
      router.refresh()
    })
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-4 sm:px-6 py-3 bg-secondary/20 border-b border-secondary/30 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          {TYPE_LABEL[matchType]}
        </span>
        <span className="text-sm text-foreground font-medium">{matchLabel}</span>
        <span className="text-xs text-text-muted ml-auto">
          {customers.length} matching profiles
        </span>
      </div>

      <div className="divide-y divide-secondary/30">
        {customers.map((c) => {
          const lastVisit = c.lastVisit ? new Date(c.lastVisit) : null
          const joined = c.createdAt ? new Date(c.createdAt) : null
          const isPending = pendingId === c.id && pending
          const isConfirming = confirmingId === c.id

          return (
            <div
              key={c.id}
              className={`p-4 sm:p-6 flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap ${
                c.recommended ? 'bg-primary/5' : ''
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                  {c.firstName?.[0]}
                  {c.lastName?.[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">
                      {c.firstName} {c.lastName}
                    </span>
                    {c.recommended && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Recommended keeper
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-text-muted mt-0.5">
                    {c.email || '—'}
                    {c.phone && (
                      <>
                        <span className="mx-2">·</span>
                        {c.phone}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    <strong className="text-foreground">{c.bookingCount}</strong>{' '}
                    appointment{c.bookingCount === 1 ? '' : 's'}
                    {lastVisit && (
                      <>
                        <span className="mx-2">·</span>
                        Last visit {format(lastVisit, 'MMM d, yyyy')}
                      </>
                    )}
                    {joined && (
                      <>
                        <span className="mx-2">·</span>
                        Joined {format(joined, 'MMM yyyy')}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {c.recommended ? (
                  <span className="px-3 py-1.5 text-xs text-text-muted">Keep</span>
                ) : isConfirming ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Deleting...' : 'Confirm delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-full text-xs font-medium border border-secondary/60 text-foreground hover:bg-secondary/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setError(null)
                      setConfirmingId(c.id)
                    }}
                    disabled={pending}
                    className="px-3 py-1.5 rounded-full text-xs font-medium border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="px-4 sm:px-6 py-3 bg-red-50 border-t border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
    </Card>
  )
}
