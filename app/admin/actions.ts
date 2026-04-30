'use server'

import { revalidatePath } from 'next/cache'
import {
  invalidateAllSquareCache,
} from '@/lib/square/admin'
import { invalidateSquarePaymentsCache } from '@/lib/square/payments'

export async function refreshSquareData(path?: string): Promise<void> {
  invalidateAllSquareCache()
  invalidateSquarePaymentsCache()
  // Revalidate the requesting admin page so the next render fetches fresh data
  revalidatePath(path || '/admin', 'layout')
}
