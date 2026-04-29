import { bookingsApi, SQUARE_LOCATION_ID } from './client'
import { v4 as uuidv4 } from 'uuid'

interface CreateBookingParams {
  squareCustomerId: string | null
  squareServiceVariationId: string
  startAt: string // ISO 8601 datetime
  durationMinutes: number
}

export async function createSquareBooking(params: CreateBookingParams): Promise<string | null> {
  const response = await bookingsApi.create({
    idempotencyKey: uuidv4(),
    booking: {
      locationId: SQUARE_LOCATION_ID,
      customerId: params.squareCustomerId || undefined,
      startAt: params.startAt,
      appointmentSegments: [
        {
          serviceVariationId: params.squareServiceVariationId,
          durationMinutes: params.durationMinutes,
          teamMemberId: 'me',
        },
      ],
    },
  })

  return response.booking?.id || null
}

export async function cancelSquareBooking(bookingId: string): Promise<void> {
  // Get the current booking version first
  const getResponse = await bookingsApi.get({ bookingId })
  const version = getResponse.booking?.version

  await bookingsApi.cancel({
    bookingId,
    bookingVersion: version,
  })
}

interface UpdateBookingParams {
  bookingId: string
  startAt: string
  durationMinutes: number
  squareServiceVariationId: string
  customerNote?: string | null
}

export async function updateSquareBooking(
  params: UpdateBookingParams
): Promise<void> {
  // Optimistic concurrency: Square requires the current booking version
  const getResponse = await bookingsApi.get({ bookingId: params.bookingId })
  const version = getResponse.booking?.version

  await bookingsApi.update({
    bookingId: params.bookingId,
    idempotencyKey: uuidv4(),
    booking: {
      version,
      locationId: SQUARE_LOCATION_ID,
      startAt: params.startAt,
      customerNote: params.customerNote ?? undefined,
      appointmentSegments: [
        {
          serviceVariationId: params.squareServiceVariationId,
          durationMinutes: params.durationMinutes,
          teamMemberId: 'me',
        },
      ],
    },
  })
}
