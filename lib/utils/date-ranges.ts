import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from 'date-fns'

export type DateRangePreset =
  | 'today'
  | 'yesterday'
  | 'this_week'
  | 'last_week'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'last_year'
  | 'last_30'
  | 'last_90'
  | 'last_365'
  | 'all_time'

export type ComparisonPreset =
  | 'none'
  | 'prior_period'
  | 'prior_year'
  | 'two_years_prior'
  | 'three_years_prior'

export interface DateRange {
  start: Date | null // null = all time
  end: Date
  label: string
}

export const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'last_year', label: 'Last year' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
  { value: 'last_365', label: 'Last 365 days' },
  { value: 'all_time', label: 'All time' },
]

export const COMPARISON_PRESETS: { value: ComparisonPreset; label: string }[] = [
  { value: 'none', label: 'No comparison' },
  { value: 'prior_period', label: 'Prior period' },
  { value: 'prior_year', label: 'Prior year' },
  { value: 'two_years_prior', label: '2 years prior' },
  { value: 'three_years_prior', label: '3 years prior' },
]

export function getDateRange(preset: DateRangePreset, now: Date = new Date()): DateRange {
  const weekStartsOn = 0 // Sunday
  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), label: 'Today' }
    case 'yesterday': {
      const y = subDays(now, 1)
      return { start: startOfDay(y), end: endOfDay(y), label: 'Yesterday' }
    }
    case 'this_week':
      return {
        start: startOfWeek(now, { weekStartsOn }),
        end: endOfWeek(now, { weekStartsOn }),
        label: 'This week',
      }
    case 'last_week': {
      const lw = subWeeks(now, 1)
      return {
        start: startOfWeek(lw, { weekStartsOn }),
        end: endOfWeek(lw, { weekStartsOn }),
        label: 'Last week',
      }
    }
    case 'this_month':
      return { start: startOfMonth(now), end: endOfMonth(now), label: 'This month' }
    case 'last_month': {
      const lm = subMonths(now, 1)
      return { start: startOfMonth(lm), end: endOfMonth(lm), label: 'Last month' }
    }
    case 'this_year':
      return { start: startOfYear(now), end: endOfYear(now), label: 'This year' }
    case 'last_year': {
      const ly = subYears(now, 1)
      return { start: startOfYear(ly), end: endOfYear(ly), label: 'Last year' }
    }
    case 'last_30':
      return { start: startOfDay(subDays(now, 30)), end: endOfDay(now), label: 'Last 30 days' }
    case 'last_90':
      return { start: startOfDay(subDays(now, 90)), end: endOfDay(now), label: 'Last 90 days' }
    case 'last_365':
      return { start: startOfDay(subDays(now, 365)), end: endOfDay(now), label: 'Last 365 days' }
    case 'all_time':
      return { start: null, end: endOfDay(now), label: 'All time' }
  }
}

export function getComparisonRange(
  primary: DateRange,
  preset: ComparisonPreset
): DateRange | null {
  if (preset === 'none' || primary.start === null) return null

  const start = primary.start
  const end = primary.end

  switch (preset) {
    case 'prior_period': {
      const lengthMs = end.getTime() - start.getTime()
      const compareEnd = new Date(start.getTime() - 1)
      const compareStart = new Date(compareEnd.getTime() - lengthMs)
      return {
        start: compareStart,
        end: compareEnd,
        label: 'Prior period',
      }
    }
    case 'prior_year':
      return {
        start: subYears(start, 1),
        end: subYears(end, 1),
        label: 'Prior year',
      }
    case 'two_years_prior':
      return {
        start: subYears(start, 2),
        end: subYears(end, 2),
        label: '2 years prior',
      }
    case 'three_years_prior':
      return {
        start: subYears(start, 3),
        end: subYears(end, 3),
        label: '3 years prior',
      }
  }
  return null
}

export function calculateDelta(current: number, previous: number): {
  pct: number | null
  direction: 'up' | 'down' | 'flat' | 'na'
} {
  if (previous === 0) {
    if (current === 0) return { pct: 0, direction: 'flat' }
    return { pct: null, direction: 'na' } // can't compute % growth from 0
  }
  const pct = ((current - previous) / previous) * 100
  if (Math.abs(pct) < 0.01) return { pct: 0, direction: 'flat' }
  return { pct, direction: pct > 0 ? 'up' : 'down' }
}

export function isValidDateRangePreset(value: string): value is DateRangePreset {
  return DATE_PRESETS.some((p) => p.value === value)
}

export function isValidComparisonPreset(value: string): value is ComparisonPreset {
  return COMPARISON_PRESETS.some((p) => p.value === value)
}
