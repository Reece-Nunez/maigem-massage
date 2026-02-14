import { NextRequest, NextResponse } from 'next/server'
import { getSquareServiceById } from '@/lib/square/services'
import { findNextAvailableDate } from '@/lib/square/availability'
import { format, addDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const serviceId = searchParams.get('service_id')

    if (!serviceId) {
      return NextResponse.json(
        { error: 'service_id is required' },
        { status: 400 }
      )
    }

    const service = await getSquareServiceById(serviceId)

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    const nextDate = await findNextAvailableDate(
      service.square_variation_id,
      tomorrow
    )

    return NextResponse.json({ date: nextDate })
  } catch (error) {
    console.error('Error finding next available date:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
