import { unstable_cache, revalidateTag } from 'next/cache'
import { paymentsApi, SQUARE_LOCATION_ID } from './client'

export interface AdminPayment {
  id: string
  status: string
  createdAt: string
  customerId: string | null
  orderId: string | null
  // All amounts are in cents
  gross: number      // totalMoney (amount + tip)
  amount: number     // amountMoney (excluding tip)
  tip: number        // tipMoney
  fees: number       // sum of processingFee[].amountMoney
  refunded: number   // refundedMoney
  net: number        // gross - fees - refunded
}

const CACHE_TAG_PAYMENTS = 'square-payments'
const CACHE_REVALIDATE_SECONDS = 300

function bigIntToCents(value: bigint | number | undefined | null): number {
  if (value == null) return 0
  return typeof value === 'bigint' ? Number(value) : value
}

async function fetchAllPayments(): Promise<AdminPayment[]> {
  const payments: AdminPayment[] = []

  // Square defaults beginTime to "1 year ago" when omitted. We want everything,
  // so explicitly request a wide range starting 5 years ago.
  const beginTime = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000).toISOString()

  try {
    for await (const p of await paymentsApi.list({
      locationId: SQUARE_LOCATION_ID,
      beginTime,
      sortOrder: 'DESC',
      limit: 100,
    })) {
      const gross = bigIntToCents(p.totalMoney?.amount)
      const amount = bigIntToCents(p.amountMoney?.amount)
      const tip = bigIntToCents(p.tipMoney?.amount)
      const fees = (p.processingFee || []).reduce(
        (sum, f) => sum + bigIntToCents(f.amountMoney?.amount),
        0
      )
      const refunded = bigIntToCents(p.refundedMoney?.amount)
      const net = gross - fees - refunded

      payments.push({
        id: p.id || '',
        status: p.status || 'UNKNOWN',
        createdAt: p.createdAt || '',
        customerId: p.customerId || null,
        orderId: p.orderId || null,
        gross,
        amount,
        tip,
        fees,
        refunded,
        net,
      })
    }
  } catch (err) {
    // Log full error so /admin/finances surfaces config issues instead of
    // silently rendering "no data". The diagnostic route at
    // /api/admin/diagnose-payments returns these errors to the browser.
    console.error('[square/payments] Error fetching payments:', err)
    return []
  }

  return payments
}

export const getSquarePayments = unstable_cache(
  fetchAllPayments,
  ['square-payments'],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: [CACHE_TAG_PAYMENTS] }
)

export function invalidateSquarePaymentsCache(): void {
  revalidateTag(CACHE_TAG_PAYMENTS, { expire: 0 })
}
