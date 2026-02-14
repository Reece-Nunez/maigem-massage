export interface SquareService {
  id: string
  name: string
  description: string | null
  duration_minutes: number
  price_cents: number | null
  price_display: string | null
  is_active: boolean
  sort_order: number
  square_catalog_id: string
  square_variation_id: string
}

export type PaymentMethod = 'pay_at_appointment' | 'pay_online'

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'failed'
