import { bookingsApi, SQUARE_LOCATION_ID } from './client'
import { toZonedTime } from 'date-fns-tz'

const BUSINESS_TIMEZONE = 'America/Chicago'

interface AvailabilitySlot {
  time: string // HH:mm format in business timezone
  available: boolean
}

export async function getSquareAvailability(
  date: string, // YYYY-MM-DD
  serviceVariationId: string,
  durationMinutes: number
): Promise<AvailabilitySlot[]> {
  // Search for availability on the given date (use full day in UTC)
  const startAt = `${date}T00:00:00Z`
  const endAt = `${date}T23:59:59Z`

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

  // Transform Square availability into our slot format
  // Convert UTC times to business timezone
  const slots: AvailabilitySlot[] = availabilities.map((avail) => {
    const utcDate = new Date(avail.startAt!)
    const zonedDate = toZonedTime(utcDate, BUSINESS_TIMEZONE)
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
