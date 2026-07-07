import { bookingsApi, SQUARE_LOCATION_ID } from './client'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const BUSINESS_TIMEZONE = 'America/Chicago'

interface AvailabilitySlot {
  time: string // HH:mm format in business timezone
  available: boolean
}

// The Chicago calendar date (YYYY-MM-DD) for a UTC instant. Used both to
// build the query window and to keep only slots that land on the requested
// local day.
function chicagoDateString(utc: Date): string {
  const zoned = toZonedTime(utc, BUSINESS_TIMEZONE)
  const year = zoned.getFullYear()
  const month = (zoned.getMonth() + 1).toString().padStart(2, '0')
  const day = zoned.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

export async function getSquareAvailability(
  date: string, // YYYY-MM-DD
  serviceVariationId: string,
  durationMinutes: number
): Promise<AvailabilitySlot[]> {
  // Query the requested day in *business-local* time, not UTC. Using a UTC
  // day window (00:00Z–23:59Z) shifts the range by Chicago's offset, so it
  // dropped evening slots on the requested date and leaked late-evening slots
  // from the previous day. fromZonedTime converts a Chicago wall-clock time to
  // the correct UTC instant for Square's startAtRange.
  const startAt = fromZonedTime(`${date}T00:00:00`, BUSINESS_TIMEZONE).toISOString()
  const endAt = fromZonedTime(`${date}T23:59:59`, BUSINESS_TIMEZONE).toISOString()

  const response = await bookingsApi.searchAvailability({
    query: {
      filter: {
        startAtRange: {
          startAt,
          endAt,
        },
        locationId: SQUARE_LOCATION_ID,
        segmentFilters: [
          {
            serviceVariationId,
          },
        ],
      },
    },
  })

  const availabilities = response.availabilities || []

  // Transform Square availability into our slot format, converting UTC times
  // to the business timezone. Guard against DST edges by keeping only slots
  // whose Chicago date matches the requested date.
  const slots: AvailabilitySlot[] = availabilities
    .filter((avail) => avail.startAt && chicagoDateString(new Date(avail.startAt)) === date)
    .map((avail) => {
      const zonedDate = toZonedTime(new Date(avail.startAt!), BUSINESS_TIMEZONE)
      const hours = zonedDate.getHours().toString().padStart(2, '0')
      const minutes = zonedDate.getMinutes().toString().padStart(2, '0')

      return {
        time: `${hours}:${minutes}`,
        available: true,
      }
    })

  return slots
}

export async function findNextAvailableDate(
  serviceVariationId: string,
  fromDate: string // YYYY-MM-DD
): Promise<string | null> {
  // Search in 7-day windows up to 60 days out
  const startDate = new Date(fromDate + 'T12:00:00Z')

  for (let i = 0; i < 9; i++) {
    const windowStart = new Date(startDate)
    windowStart.setDate(windowStart.getDate() + (i * 7))
    const windowEnd = new Date(windowStart)
    windowEnd.setDate(windowEnd.getDate() + 7)

    const startAt = windowStart.toISOString()
    const endAt = windowEnd.toISOString()

    try {
      const response = await bookingsApi.searchAvailability({
        query: {
          filter: {
            startAtRange: {
              startAt,
              endAt,
            },
            locationId: SQUARE_LOCATION_ID,
            segmentFilters: [
              {
                serviceVariationId,
              },
            ],
          },
        },
      })

      const availabilities = response.availabilities || []
      if (availabilities.length > 0 && availabilities[0].startAt) {
        // Return the date of the first available slot in business timezone
        const utcDate = new Date(availabilities[0].startAt)
        const zonedDate = toZonedTime(utcDate, BUSINESS_TIMEZONE)
        const year = zonedDate.getFullYear()
        const month = (zonedDate.getMonth() + 1).toString().padStart(2, '0')
        const day = zonedDate.getDate().toString().padStart(2, '0')
        return `${year}-${month}-${day}`
      }
    } catch (err) {
      console.error('Error searching Square availability:', err)
    }
  }

  return null
}
