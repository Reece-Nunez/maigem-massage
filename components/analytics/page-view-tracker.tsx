'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackEvent } from '@/lib/analytics/track'

export function PageViewTracker() {
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (!pathname) return

    // Skip admin and auth routes — those are internal
    if (pathname.startsWith('/admin') || pathname.startsWith('/auth')) {
      lastPath.current = pathname
      return
    }

    // Avoid duplicate fires for the same path (e.g. StrictMode double-effect)
    if (lastPath.current === pathname) return
    lastPath.current = pathname

    trackEvent('page_view', pathname)
  }, [pathname])

  return null
}
