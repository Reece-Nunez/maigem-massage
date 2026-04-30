'use server'

import { deleteSquareCustomer } from '@/lib/square/customers'
import { invalidateAllSquareCache } from '@/lib/square/admin'
import { revalidatePath } from 'next/cache'

export interface DeleteCustomerResult {
  ok: boolean
  error?: string
}

export async function deleteDuplicateCustomer(
  customerId: string
): Promise<DeleteCustomerResult> {
  if (!customerId) return { ok: false, error: 'Missing customer id' }
  try {
    await deleteSquareCustomer(customerId)
    invalidateAllSquareCache()
    revalidatePath('/admin/clients')
    revalidatePath('/admin/clients/duplicates')
    return { ok: true }
  } catch (err: unknown) {
    console.error('Failed to delete customer:', err)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: msg }
  }
}
