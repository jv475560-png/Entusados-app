import { useCallback, useEffect, useRef, useState } from 'react'
import type { Ingredient } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export function useInventory() {
  const demoIngredients = useDemoStore((state) => state.ingredients)
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    isSupabaseEnabled ? [] : demoIngredients,
  )
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const { data, error: err } = await supabase
      .from('ingredients')
      .select('*')
      .eq('is_active', true)
      .order('name')
    if (err) setError(err.message)
    else setIngredients((data ?? []) as Ingredient[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setIngredients(demoIngredients)
      return
    }

    void load()
    const channel = supabase
      .channel(`inventory-live-${instanceRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => void load())
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [demoIngredients, load])

  const setStock = useCallback(
    async (ingredientId: string, quantity: number) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().setStock(ingredientId, quantity)
        return
      }
      const { error: err } = await supabase
        .from('ingredients')
        .update({ stock_qty: Math.max(0, quantity) })
        .eq('id', ingredientId)
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const adjustStock = useCallback(
    async (ingredientId: string, delta: number) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().adjustStock(ingredientId, delta)
        return
      }
      const current = ingredients.find((i) => i.id === ingredientId)
      if (!current) return
      await setStock(ingredientId, current.stock_qty + delta)
    },
    [ingredients, setStock],
  )

  const lowStock = ingredients.filter((ingredient) => ingredient.stock_qty <= ingredient.min_stock)

  return { ingredients, lowStock, loading, error, setStock, adjustStock, refresh: load }
}
