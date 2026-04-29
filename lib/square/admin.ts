import { unstable_cache, revalidateTag } from 'next/cache'
import { bookingsApi, customersApi, SQUARE_LOCATION_ID } from './client'
import { getSquareServices } from './services'

// Types for admin display
export interface AdminBooking {
  id: string
  status: string
  startAt: string
  endAt: string | null
  customerName: string
  customerEmail: string | null
  customerPhone: string | null
  customerId: string | null
  serviceName: string
  durationMinutes: number
  notes: string | null
  createdAt: string | null
}

export interface AdminCustomer {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  createdAt: string | null
}

const CACHE_TAG_CUSTOMERS = 'square-customers'
const CACHE_TAG_BOOKINGS = 'square-bookings'
const CACHE_REVALIDATE_SECONDS = 60

// Map Square booking status to our display status
function mapBookingStatus(squareStatus: string): string {
  switch (squareStatus) {
    case 'ACCEPTED': return 'confirmed'
    case 'PENDING': return 'pending'
    case 'CANCELLED_BY_CUSTOMER':
    case 'CANCELLED_BY_SELLER':
    case 'DECLINED': return 'cancelled'
    case 'NO_SHOW': return 'no_show'
    default: return squareStatus.toLowerCase()
  }
}

// Fetch all customers from Square (paginated batches of 100)
async function fetchAllCustomers(): Promise<AdminCustomer[]> {
  const customers: AdminCustomer[] = []

  try {
    let cursor: string | undefined
    do {
      const response = await customersApi.search({
        limit: BigInt(100),
        ...(cursor ? { cursor } : {}),
      })
      const data = response?.customers || []
      for (const c of data) {
        customers.push({
          id: c.id!,
          firstName: c.givenName || '',
          lastName: c.familyName || '',
          email: c.emailAddress || null,
          phone: c.phoneNumber || null,
          createdAt: c.createdAt || null,
        })
      }
      cursor = response?.cursor || undefined
    } while (cursor)
  } catch (err) {
    console.error('Error fetching Square customers:', err)
  }

  customers.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return customers
}

export const getSquareCustomers = unstable_cache(
  fetchAllCustomers,
  ['square-customers'],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAG_CUSTOMERS] }
)

// Fetch all bookings, joining customer + service from already-cached lists.
// This replaces the previous N+1 pattern (one customersApi.get per booking).
async function fetchAllBookings(): Promise<AdminBooking[]> {
  const bookings: AdminBooking[] = []

  // These are themselves cached — reusing them avoids extra round-trips.
  const [services, customers] = await Promise.all([
    getSquareServices(),
    getSquareCustomers(),
  ])

  const serviceMap = new Map(
    services.flatMap((s) => [
      [s.square_variation_id, s],
      [s.square_catalog_id, s],
    ])
  )
  const customerMap = new Map(customers.map((c) => [c.id, c]))

  // Pull all bookings from Square (single paginated stream)
  const rawBookings: any[] = []
  try {
    for await (const booking of await bookingsApi.list({
      locationId: SQUARE_LOCATION_ID,
    })) {
      rawBookings.push(booking)
    }
  } catch (err) {
    console.error('Error fetching Square bookings:', err)
    return []
  }

  for (const booking of rawBookings) {
    const customer = booking.customerId
      ? customerMap.get(booking.customerId)
      : null

    const segment = booking.appointmentSegments?.[0]
    const serviceVariationId = segment?.serviceVariationId
    const service = serviceVariationId ? serviceMap.get(serviceVariationId) : null
    const durationMinutes = segment?.durationMinutes
      ? Number(segment.durationMinutes)
      : 60

    let endAt: string | null = null
    if (booking.startAt) {
      const start = new Date(booking.startAt)
      const end = new Date(start.getTime() + durationMinutes * 60000)
      endAt = end.toISOString()
    }

    bookings.push({
      id: booking.id,
      status: mapBookingStatus(booking.status || 'PENDING'),
      startAt: booking.startAt || '',
      endAt,
      customerName: customer
        ? `${customer.firstName} ${customer.lastName}`.trim() || 'Unknown Client'
        : 'Unknown Client',
      customerEmail: customer?.email || null,
      customerPhone: customer?.phone || null,
      customerId: booking.customerId || null,
      serviceName: service?.name || 'Unknown Service',
      durationMinutes,
      notes: booking.customerNote || null,
      createdAt: booking.createdAt || null,
    })
  }

  bookings.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  return bookings
}

export const getSquareBookings = unstable_cache(
  fetchAllBookings,
  ['square-bookings'],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAG_BOOKINGS] }
)

// Booking counts per customer — derived from cached bookings, no extra API.
export async function getSquareBookingCountsByCustomer(): Promise<Map<string, number>> {
  const bookings = await getSquareBookings()
  const counts = new Map<string, number>()
  for (const b of bookings) {
    if (b.customerId) {
      counts.set(b.customerId, (counts.get(b.customerId) || 0) + 1)
    }
  }
  return counts
}

// Fetch a single customer — try the cached customers list first; only hit
// Square directly if we miss (e.g. brand-new customer not yet in cache).
export async function getSquareCustomerById(
  customerId: string
): Promise<AdminCustomer | null> {
  const customers = await getSquareCustomers()
  const cached = customers.find((c) => c.id === customerId)
  if (cached) return cached

  try {
    const response = await customersApi.get({ customerId })
    const c = response?.customer
    if (!c) return null

    return {
      id: c.id!,
      firstName: c.givenName || '',
      lastName: c.familyName || '',
      email: c.emailAddress || null,
      phone: c.phoneNumber || null,
      createdAt: c.createdAt || null,
    }
  } catch (err) {
    console.error('Error fetching Square customer:', err)
    return null
  }
}

// Bookings for a specific customer — derived from cached full list.
export async function getSquareBookingsForCustomer(
  customerId: string
): Promise<AdminBooking[]> {
  const allBookings = await getSquareBookings()
  return allBookings.filter((b) => b.customerId === customerId)
}

// Cache invalidation helpers — call these after admin actions that mutate
// Square state (accept, cancel, create booking) so the dashboard reflects
// changes immediately instead of waiting for the 60s revalidation window.
export function invalidateSquareBookingsCache(): void {
  revalidateTag(CACHE_TAG_BOOKINGS, { expire: 0 })
}

export function invalidateSquareCustomersCache(): void {
  revalidateTag(CACHE_TAG_CUSTOMERS, { expire: 0 })
}

export function invalidateAllSquareCache(): void {
  revalidateTag(CACHE_TAG_BOOKINGS, { expire: 0 })
  revalidateTag(CACHE_TAG_CUSTOMERS, { expire: 0 })
}
