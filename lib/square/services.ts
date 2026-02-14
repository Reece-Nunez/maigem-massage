import { catalogApi } from './client'
import type { SquareService } from './types'

// In-memory cache with 5-minute TTL
let cachedServices: SquareService[] | null = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 5 * 60 * 1000

function transformCatalogItem(item: any, index: number): SquareService | null {
  if (item.type !== 'ITEM' || !item.itemData) return null

  const variation = item.itemData.variations?.[0]
  if (!variation?.itemVariationData) return null

  const variationData = variation.itemVariationData
  const priceMoney = variationData.priceMoney

  // Duration: Square stores service duration in milliseconds as a string
  const durationMs = variationData.serviceDuration
  let durationMinutes = 60
  if (durationMs) {
    durationMinutes = Math.round(Number(durationMs) / 60000)
  }

  // Price: Square stores in smallest currency unit (cents for USD)
  const priceCents = priceMoney?.amount != null
    ? Number(priceMoney.amount)
    : null
  const priceDisplay = priceCents != null
    ? `$${(priceCents / 100).toFixed(0)}`
    : 'Price Varies'

  return {
    id: item.id,
    name: item.itemData.name || '',
    description: item.itemData.description || null,
    duration_minutes: durationMinutes,
    price_cents: priceCents,
    price_display: priceDisplay,
    is_active: true,
    sort_order: index,
    square_catalog_id: item.id,
    square_variation_id: variation.id,
  }
}

export async function getSquareServices(): Promise<SquareService[]> {
  // Return from cache if fresh
  if (cachedServices && Date.now() - cacheTimestamp < CACHE_TTL_MS) {
    return cachedServices
  }

  const services: SquareService[] = []

  // Fetch catalog items using async iteration (handles pagination)
  for await (const item of await catalogApi.list({ types: 'ITEM' })) {
    const service = transformCatalogItem(item, services.length)
    if (service) {
      services.push(service)
    }
  }

  cachedServices = services
  cacheTimestamp = Date.now()

  return services
}

export async function getSquareServiceById(id: string): Promise<SquareService | null> {
  const services = await getSquareServices()
  return services.find(s => s.id === id) || null
}

export function clearServiceCache(): void {
  cachedServices = null
  cacheTimestamp = 0
}
