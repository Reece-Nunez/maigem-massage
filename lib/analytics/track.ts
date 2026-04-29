type EventType =
  | 'phone_click'
  | 'email_click'
  | 'booking_started'
  | 'booking_completed'
  | 'directions_click'
  | 'contact_form_submit'

export function trackEvent(
  event_type: EventType,
  source?: string,
  metadata?: Record<string, unknown>
) {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({ event_type, source, metadata })
  const url = '/api/events'

  // sendBeacon survives page navigation (e.g. tel: links)
  if (navigator.sendBeacon) {
    const blob = new Blob([payload], { type: 'application/json' })
    navigator.sendBeacon(url, blob)
    return
  }

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {})
}
