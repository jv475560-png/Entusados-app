import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseEnabled = Boolean(url && anonKey)

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null

export const storeConfig = {
  name: 'ENTUSADOS',
  lat: Number(import.meta.env.VITE_STORE_LAT ?? 4.711),
  lng: Number(import.meta.env.VITE_STORE_LNG ?? -74.0721),
  deliveryFee: Number(import.meta.env.VITE_DELIVERY_FEE ?? 3500),
} as const

export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado. La app corre en modo demo.')
  return supabase
}
