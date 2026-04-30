'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  COMPARISON_PRESETS,
  DATE_PRESETS,
  type ComparisonPreset,
  type DateRangePreset,
} from '@/lib/utils/date-ranges'

interface Props {
  date: DateRangePreset
  compare: ComparisonPreset
}

export function FinancesFilters({ date, compare }: Props) {
  const router = useRouter()
  const [dateOpen, setDateOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const dateRef = useRef<HTMLDivElement>(null)
  const compareRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (dateRef.current && !dateRef.current.contains(e.target as Node)) {
        setDateOpen(false)
      }
      if (compareRef.current && !compareRef.current.contains(e.target as Node)) {
        setCompareOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function setDate(value: DateRangePreset) {
    const params = new URLSearchParams()
    params.set('date', value)
    params.set('compare', compare)
    router.push(`/admin/finances?${params.toString()}`)
    setDateOpen(false)
  }

  function setCompare(value: ComparisonPreset) {
    const params = new URLSearchParams()
    params.set('date', date)
    params.set('compare', value)
    router.push(`/admin/finances?${params.toString()}`)
    setCompareOpen(false)
  }

  const dateLabel = DATE_PRESETS.find((p) => p.value === date)?.label || 'Date'
  const compareLabel =
    COMPARISON_PRESETS.find((p) => p.value === compare)?.label || 'Compare'

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {/* Date dropdown */}
      <div className="relative" ref={dateRef}>
        <button
          type="button"
          onClick={() => {
            setDateOpen((o) => !o)
            setCompareOpen(false)
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-secondary/60 bg-white text-foreground text-sm font-medium hover:bg-secondary/20 transition-colors"
        >
          <span className="text-text-muted text-xs">Date</span>
          <span>{dateLabel}</span>
          <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {dateOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-secondary/30 py-1 z-20 max-h-80 overflow-auto">
            {DATE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setDate(p.value)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  date === p.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary/20 text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Comparison dropdown */}
      <div className="relative" ref={compareRef}>
        <button
          type="button"
          onClick={() => {
            setCompareOpen((o) => !o)
            setDateOpen(false)
          }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-secondary/60 bg-white text-foreground text-sm font-medium hover:bg-secondary/20 transition-colors"
        >
          <span className="text-text-muted text-xs">vs</span>
          <span>{compareLabel}</span>
          <svg className="w-3 h-3 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {compareOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-secondary/30 py-1 z-20">
            {COMPARISON_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setCompare(p.value)}
                className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                  compare === p.value
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'hover:bg-secondary/20 text-foreground'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
