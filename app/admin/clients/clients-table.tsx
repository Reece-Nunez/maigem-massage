'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { format, formatDistanceToNow } from 'date-fns'
import type { AdminCustomer } from '@/lib/square/admin'

type EnrichedCustomer = AdminCustomer & {
  bookingCount: number
  lastVisit: string | null
  nextVisit: string | null
}

interface Props {
  customers: EnrichedCustomer[]
}

export function ClientsTable({ customers }: Props) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'recent_visit' | 'name' | 'bookings' | 'joined'>('recent_visit')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    let result = customers.filter((c) => {
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
    } else if (sortBy === 'joined') {
      result = [...result].sort((a, b) => {
        const aT = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const bT = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return bT - aT
      })
    } else {
      // recent_visit (default): most recent visit first; clients without
      // any visits sink to the bottom.
      result = [...result].sort((a, b) => {
        const aT = a.lastVisit ? new Date(a.lastVisit).getTime() : 0
        const bT = b.lastVisit ? new Date(b.lastVisit).getTime() : 0
        return bT - aT
      })
    }

    return result
  }, [customers, search, sortBy])

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
          <option value="recent_visit">Sort: Most recent visit</option>
          <option value="bookings">Sort: Most appointments</option>
          <option value="name">Sort: Name (A→Z)</option>
          <option value="joined">Sort: Newest joined</option>
        </select>
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
                    Last Visit
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground hidden lg:table-cell">
                    Next Visit
                  </th>
                  <th className="text-left px-4 sm:px-6 py-3 sm:py-4 text-sm font-semibold text-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary/30">
                {filtered.map((customer) => {
                  const lastVisitDate = customer.lastVisit
                    ? new Date(customer.lastVisit)
                    : null
                  const nextVisitDate = customer.nextVisit
                    ? new Date(customer.nextVisit)
                    : null
                  return (
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
                        {lastVisitDate ? (
                          <span title={format(lastVisitDate, 'MMM d, yyyy')}>
                            {formatDistanceToNow(lastVisitDate, { addSuffix: true })}
                          </span>
                        ) : (
                          <span className="text-text-muted/50">Never</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-text-muted text-sm hidden lg:table-cell">
                        {nextVisitDate ? (
                          <span className="text-primary" title={format(nextVisitDate, 'MMM d, yyyy h:mm a')}>
                            {format(nextVisitDate, 'MMM d')}
                          </span>
                        ) : (
                          <span className="text-text-muted/50">—</span>
                        )}
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
                  )
                })}
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
