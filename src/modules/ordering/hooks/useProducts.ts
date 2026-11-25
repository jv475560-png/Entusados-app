import { useEffect, useState } from 'react'
import type { Product } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export function useProducts() {
  const demoProducts = useDemoStore((state) => state.products)
  const [products, setProducts] = useState<Product[]>(isSupabaseEnabled ? [] : demoProducts)
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setProducts(demoProducts)
      return
    }

    let cancelled = false
    setLoading(true)
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('name')
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err) setError(err.message)
        else setProducts((data ?? []) as Product[])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [demoProducts])

  return { products, loading, error }
}
