import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSquareServices } from '@/lib/square/services'

export async function GET() {
  try {
    const services = await getSquareServices()
    return NextResponse.json(services)
  } catch (error) {
    console.error('Square catalog fetch failed, falling back to Supabase:', error)

    // Fallback to local database
    try {
      const supabase = await createClient()
      const { data: services, error: dbError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (dbError) {
        return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
      }

      return NextResponse.json(services)
    } catch (fallbackError) {
      console.error('Supabase fallback also failed:', fallbackError)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }
  }
}
