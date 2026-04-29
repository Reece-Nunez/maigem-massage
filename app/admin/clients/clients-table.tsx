'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { format, subDays } from 'date-fns'
import type { AdminCustomer } from '@/lib/square/admin'

type CustomerWithCount = AdminCustomer & { bookingCount: number }

const RANGES = [
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: '365', label: 'Last year', days: 365 },
  { key: 'all', label: 'All time', days: null as number | null },
] as const

interface Props {
  customers: CustomerWithCount[]
}

export function ClientsTable({ customers }: Props) {
  const [search, setSearch] = useState('')
  const [rangeKey, setRangeKey] = useState<(typeof RANGES)[number]['key']>('30')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'bookings'>('recent')

  const filtered = useMemo(() => {
    const range = RANGES.find(r => r.key === rangeKey)!
    const cutoff =
      range.days !== null ? subDays(new Date(), range.days) : null
    const q = search.trim().toLowerCase()

    let result = customers.filter((c) => {
      // Date filter
      if (cutoff && c.createdAt) {
        if (new Date(c.createdAt) < cutoff) return false
      } else if (cutoff && !c.createdAt) {
        return false
      }

      // Search filter
      if (q) {
        const haystack = [
          c.firstName,
          c.lastName,
          `${c.firstName} ${c.lastName}`,
          c.email || '',
          c.phone || '',
        ]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }

      return true
    })

    if (sortBy === 'name') {
      result = [...result].sort((a, b) =>
        `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      )
    } else if (sortBy === 'bookings') {
      result = [...result].sort((a, b) => b.bookingCount - a.bookingCount)
    }
    // 'recent' is the default sort from the server (createdAt desc)

    return result
  }, [customers, search, rangeKey, sortBy])

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-secondary/50 bg-white text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2.5 rounded-xl border border-secondary/50 bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
        >
          <option value="recent">Sort: Newest</option>
          <option value="name">Sort: Name (A→Z)</option>
          <option value="bookings">Sort: Most appointments</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              rangeKey === r.key
                ? 'bg-primary text-white'
                : 'bg-secondary/30 text-foreground hover:bg-secondary/50'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <p className="text-text-muted text-sm mb-4">
        Showing {filtered.length} of {customers.length} clients
      </p>

      <Card className="overflow-hidden p-0">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/20">
                <tr>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground">
                    Name
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground hidden md:table-cell">
                    Phone
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground">
                    Appts
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground hidden lg:table-cell">
                    Joined
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/30">
                {filtered.map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {customer.firstName?.[0]}
                          {customer.lastName?.[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="md:hidden text-xs text-text-muted truncate">
                            {customer.email || customer.phone || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-text-muted hidden md:table-cell">
                      {customer.email ? (
                        <a
                          href={`mailto:${customer.email}`}
                          className="hover:text-primary transition-colors"
                        >
                          {customer.email}
                        </a>
                      ) : (
                        <span className="text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-text-muted hidden md:table-cell">
                      {customer.phone ? (
                        <a
                          href={`tel:${customer.phone}`}
                          className="hover:text-primary transition-colors"
                        >
                          {customer.phone}
                        </a>
                      ) : (
                        <span className="text-text-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <span className="px-2 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                        {customer.bookingCount}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-text-muted text-sm hidden lg:table-cell">
                      {customer.createdAt
                        ? format(new Date(customer.createdAt), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <Link
                        href={`/admin/clients/${customer.id}`}
                        className="text-primary hover:underline text-sm whitespace-nowrap"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-text-muted">
            <p className="font-medium">No clients match your filters</p>
            <p className="text-sm mt-2">
              Try adjusting your search or expanding the date range.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
