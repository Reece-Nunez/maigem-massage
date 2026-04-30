import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { format } from 'date-fns'
import { getSquareCustomers, getSquareBookings } from '@/lib/square/admin'
import { RefreshSquareButton } from '@/components/admin/refresh-button'
import { DuplicateGroup } from './duplicate-group'
import type { AdminCustomer } from '@/lib/square/admin'

export const dynamic = 'force-dynamic'

export interface DuplicateCustomer extends AdminCustomer {
  bookingCount: number
  lastVisit: string | null
  recommended: boolean // pre-suggested as the one to keep
}

interface DuplicateBucket {
  matchKey: string // e.g. "email:foo@bar.com" or "phone:5805551234"
  matchType: 'email' | 'phone' | 'name'
  matchLabel: string // human-readable
  customers: DuplicateCustomer[]
}

function normalizePhone(phone: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 7) return null
  // last 10 digits — strips country code variations
  return digits.slice(-10)
}

function fullName(c: AdminCustomer): string {
  return `${c.firstName.trim()} ${c.lastName.trim()}`.trim().toLowerCase()
}

export default async function DuplicatesPage() {
  const [customers, bookings] = await Promise.all([
    getSquareCustomers(),
    getSquareBookings(),
  ])

  const bookingCount = new Map<string, number>()
  const lastVisit = new Map<string, string>()
  for (const b of bookings) {
    if (!b.customerId) continue
    bookingCount.set(b.customerId, (bookingCount.get(b.customerId) || 0) + 1)
    if (b.status === 'confirmed' || b.status === 'completed') {
      const existing = lastVisit.get(b.customerId)
      if (!existing || new Date(existing).getTime() < new Date(b.startAt).getTime()) {
        lastVisit.set(b.customerId, b.startAt)
      }
    }
  }

  // Group by email, phone, then full name (in that priority order)
  const byEmail = new Map<string, AdminCustomer[]>()
  const byPhone = new Map<string, AdminCustomer[]>()
  const byName = new Map<string, AdminCustomer[]>()

  for (const c of customers) {
    if (c.email) {
      const key = c.email.trim().toLowerCase()
      const arr = byEmail.get(key) || []
      arr.push(c)
      byEmail.set(key, arr)
    }
    const phoneKey = normalizePhone(c.phone)
    if (phoneKey) {
      const arr = byPhone.get(phoneKey) || []
      arr.push(c)
      byPhone.set(phoneKey, arr)
    }
    const nameKey = fullName(c)
    if (nameKey && nameKey.includes(' ')) {
      const arr = byName.get(nameKey) || []
      arr.push(c)
      byName.set(nameKey, arr)
    }
  }

  const seenIds = new Set<string>()
  const buckets: DuplicateBucket[] = []

  function addBucket(
    matchKey: string,
    matchType: DuplicateBucket['matchType'],
    matchLabel: string,
    members: AdminCustomer[]
  ) {
    // Filter out customers already covered by a higher-priority bucket
    const fresh = members.filter((m) => !seenIds.has(m.id))
    if (fresh.length < 2) return
    fresh.forEach((m) => seenIds.add(m.id))

    // Recommend keeping the one with the most bookings (fall back to oldest)
    const sorted = [...fresh].sort((a, b) => {
      const countDiff = (bookingCount.get(b.id) || 0) - (bookingCount.get(a.id) || 0)
      if (countDiff !== 0) return countDiff
      const aT = a.createdAt ? new Date(a.createdAt).getTime() : Infinity
      const bT = b.createdAt ? new Date(b.createdAt).getTime() : Infinity
      return aT - bT
    })

    const enriched: DuplicateCustomer[] = sorted.map((c, i) => ({
      ...c,
      bookingCount: bookingCount.get(c.id) || 0,
      lastVisit: lastVisit.get(c.id) || null,
      recommended: i === 0,
    }))

    buckets.push({ matchKey, matchType, matchLabel, customers: enriched })
  }

  // Email matches first (most reliable)
  for (const [key, members] of byEmail.entries()) {
    if (members.length > 1) addBucket(`email:${key}`, 'email', key, members)
  }
  // Then phone matches
  for (const [key, members] of byPhone.entries()) {
    if (members.length > 1) {
      const formatted = `(${key.slice(0, 3)}) ${key.slice(3, 6)}-${key.slice(6)}`
      addBucket(`phone:${key}`, 'phone', formatted, members)
    }
  }
  // Finally name matches (least reliable — could be coincidence)
  for (const [key, members] of byName.entries()) {
    if (members.length > 1) {
      const display = key.replace(/\b\w/g, (l) => l.toUpperCase())
      addBucket(`name:${key}`, 'name', display, members)
    }
  }

  const totalDuplicates = buckets.reduce(
    (sum, b) => sum + b.customers.length - 1, // count extras beyond the keeper
    0
  )

  return (
    <div>
      <Link
        href="/admin/clients"
        className="text-primary hover:underline text-sm inline-flex items-center gap-1 mb-4"
      >
        ← Back to Clients
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Duplicate Clients
        </h1>
        <RefreshSquareButton />
      </div>
      <p className="text-text-muted text-sm mb-6">
        {totalDuplicates === 0
          ? "No duplicates detected — your client list is clean."
          : `Found ${buckets.length} duplicate group${buckets.length === 1 ? '' : 's'} (${totalDuplicates} extra record${totalDuplicates === 1 ? '' : 's'} you could remove). The recommended keeper is the one with the most bookings.`}
      </p>

      {buckets.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-text-muted">No duplicates found.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {buckets.map((bucket) => (
            <DuplicateGroup
              key={bucket.matchKey}
              matchType={bucket.matchType}
              matchLabel={bucket.matchLabel}
              customers={bucket.customers}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-text-muted mt-6">
        Note: deleting a customer in Square removes their profile but does not affect past payment records. If a customer has upcoming bookings, those bookings may lose their customer reference. The recommended keeper preserves the one with the most history.
      </p>
    </div>
  )
}

// Helper unused but exported for clarity
export const __formatDate = (d: string | null) =>
  d ? format(new Date(d), 'MMM d, yyyy') : '—'
