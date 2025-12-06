import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Admin client with service role - use only on server side
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase admin credentials:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!serviceRoleKey
    })
    throw new Error('Missing Supabase admin configuration')
  }

  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
