import { useCallback, useEffect, useRef, useState } from 'react'
import type { Promotion } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export function usePromotions() {
  const demoPromotions = useDemoStore((state) => state.promotions)
  const [promotions, setPromotions] = useState<Promotion[]>(
    isSupabaseEnabled ? [] : demoPromotions,
  )
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const { data, error: err } = await supabase
      .from('promotions')
      .select('*')
      .order('sort_order')
    if (err) setError(err.message)
    else setPromotions((data ?? []) as Promotion[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setPromotions(demoPromotions)
      setLoading(false)
      return
    }

    void load()
    const channel = supabase
      .channel(`promotions-live-${instanceRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promotions' },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [demoPromotions, load])

  const addPromotion = useCallback(
    async (promotion: Omit<Promotion, 'id' | 'created_at'>) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().addPromotion(promotion)
        return
      }
      const { error: err } = await supabase.from('promotions').insert(promotion)
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const updatePromotion = useCallback(
    async (promotionId: string, patch: Partial<Promotion>) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().updatePromotion(promotionId, patch)
        return
      }
      const { error: err } = await supabase
        .from('promotions')
        .update(patch)
        .eq('id', promotionId)
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const removePromotion = useCallback(
    async (promotionId: string) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().removePromotion(promotionId)
        return
      }
      const { error: err } = await supabase.from('promotions').delete().eq('id', promotionId)
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const togglePromotion = useCallback(
    async (promotionId: string) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().togglePromotion(promotionId)
        return
      }
      const current = promotions.find((promotion) => promotion.id === promotionId)
      if (!current) return
      await updatePromotion(promotionId, { is_active: !current.is_active })
    },
    [promotions, updatePromotion],
  )

  return {
    promotions,
    activePromotions: promotions
      .filter((promotion) => promotion.is_active)
      .sort((a, b) => a.sort_order - b.sort_order),
    loading,
    error,
    addPromotion,
    updatePromotion,
    removePromotion,
    togglePromotion,
    refresh: load,
  }
}
