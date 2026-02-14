import { NextRequest, NextResponse } from 'next/server'
import { getSquareServiceById } from '@/lib/square/services'
import { getSquareAvailability } from '@/lib/square/availability'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const serviceId = searchParams.get('service_id')

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: 'date and service_id are required' },
        { status: 400 }
      )
    }

    // Get service from Square to find the variation ID
    const service = await getSquareServiceById(serviceId)

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    // Get availability from Square
    const slots = await getSquareAvailability(
      dateStr,
      service.square_variation_id,
      service.duration_minutes
    )

    return NextResponse.json({
      date: dateStr,
      slots
    })
  } catch (error) {
    console.error('Error in available-slots API:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
