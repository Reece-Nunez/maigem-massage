import { bookingsApi, customersApi, SQUARE_LOCATION_ID } from './client'
import { getSquareServices } from './services'
import { toZonedTime } from 'date-fns-tz'

const BUSINESS_TIMEZONE = 'America/Chicago'

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

// Fetch all bookings from Square with customer and service info
export async function getSquareBookings(): Promise<AdminBooking[]> {
  const bookings: AdminBooking[] = []

  // Fetch services for name lookup
  const services = await getSquareServices()
  const serviceMap = new Map(
    services.flatMap(s => [
      [s.square_variation_id, s],
      [s.square_catalog_id, s],
    ])
  )

  // Collect all bookings
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

  // Collect unique customer IDs
  const customerIds = new Set<string>()
  for (const booking of rawBookings) {
    if (booking.customerId) {
      customerIds.add(booking.customerId)
    }
  }

  // Batch fetch customers
  const customerMap = new Map<string, any>()
  for (const customerId of customerIds) {
    try {
      const response = await customersApi.get({ customerId })
      if (response?.customer) {
        customerMap.set(customerId, response.customer)
      }
    } catch {
      // Customer may have been deleted
    }
  }

  // Transform bookings
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

    // Calculate end time from start + duration
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
        ? `${customer.givenName || ''} ${customer.familyName || ''}`.trim()
        : 'Unknown Client',
      customerEmail: customer?.emailAddress || null,
      customerPhone: customer?.phoneNumber || null,
      customerId: booking.customerId || null,
      serviceName: service?.name || 'Unknown Service',
      durationMinutes,
      notes: booking.customerNote || null,
      createdAt: booking.createdAt || null,
    })
  }

  // Sort by start time descending (newest first)
  bookings.sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())

  return bookings
}

// Fetch all customers from Square
export async function getSquareCustomers(): Promise<AdminCustomer[]> {
  const customers: AdminCustomer[] = []

  try {
    // Use search instead of list — list has a bug with empty sort_field
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

  // Sort by created date descending
  customers.sort((a, b) => {
    if (!a.createdAt || !b.createdAt) return 0
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return customers
}

// Fetch a single customer from Square
export async function getSquareCustomerById(customerId: string): Promise<AdminCustomer | null> {
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

// Fetch bookings for a specific customer
export async function getSquareBookingsForCustomer(customerId: string): Promise<AdminBooking[]> {
  const allBookings = await getSquareBookings()
  return allBookings.filter(b => b.customerId === customerId)
}
