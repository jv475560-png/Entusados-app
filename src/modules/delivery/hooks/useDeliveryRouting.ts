import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DeliveryChannel, DeliveryZone } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'
import type { CoverageLocation } from '@/shared/lib/coverage'
import { resolveCoverageRoute } from '@/shared/lib/coverage'

export function useDeliveryRouting(location?: CoverageLocation) {
  const demoZones = useDemoStore((state) => state.zones)
  const demoFee = useDemoStore((state) => state.settings.deliveryFee)
  const demoDefault = useDemoStore((state) => state.settings.defaultExternalChannel)

  const [zones, setZones] = useState<DeliveryZone[]>(isSupabaseEnabled ? [] : demoZones)
  const [deliveryFee, setDeliveryFeeState] = useState(isSupabaseEnabled ? 3500 : demoFee)
  const [defaultChannel, setDefaultChannelState] = useState<DeliveryChannel>(
    isSupabaseEnabled ? 'rappi' : demoDefault,
  )
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const reload = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const [zonesRes, settingsRes] = await Promise.all([
      supabase.from('delivery_zones').select('*').order('name'),
      supabase.from('app_settings').select('key, value'),
    ])

    if (zonesRes.data) setZones(zonesRes.data as DeliveryZone[])
    if (settingsRes.data) {
      const settings = settingsRes.data as Array<{ key: string; value: string }>
      const fee = settings.find((s) => s.key === 'delivery_fee')?.value
      const fallback = settings.find((s) => s.key === 'default_external_channel')?.value
      if (fee) setDeliveryFeeState(Number(fee))
      if (fallback === 'own' || fallback === 'rappi' || fallback === 'didi') {
        setDefaultChannelState(fallback)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setZones(demoZones)
      setDeliveryFeeState(demoFee)
      setDefaultChannelState(demoDefault)
      setLoading(false)
      return
    }

    void reload()
    const channel = supabase
      .channel(`delivery-zones-live-${instanceRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_zones' },
        () => void reload(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => void reload(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [demoZones, demoFee, demoDefault, reload])

  const route = useMemo(
    () =>
      resolveCoverageRoute(
        zones,
        {
          lat: location?.lat ?? null,
          lng: location?.lng ?? null,
          neighborhood: location?.neighborhood ?? null,
          address: location?.address ?? null,
        },
        defaultChannel,
      ),
    [
      zones,
      location?.lat,
      location?.lng,
      location?.neighborhood,
      location?.address,
      defaultChannel,
    ],
  )

  const toggleZone = useCallback(
    async (zoneId: string) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().toggleZone(zoneId)
        return
      }
      const current = zones.find((zone) => zone.id === zoneId)
      if (!current) return
      await supabase
        .from('delivery_zones')
        .update({ is_active: !current.is_active })
        .eq('id', zoneId)
      await reload()
    },
    [zones, reload],
  )

  const updateZone = useCallback(
    async (zoneId: string, patch: Partial<DeliveryZone>) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().updateZone(zoneId, patch)
        return
      }
      await supabase.from('delivery_zones').update(patch).eq('id', zoneId)
      await reload()
    },
    [reload],
  )

  const addZone = useCallback(
    async (zone: Omit<DeliveryZone, 'id'>) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().addZone(zone)
        return
      }
      await supabase.from('delivery_zones').insert(zone)
      await reload()
    },
    [reload],
  )

  const removeZone = useCallback(
    async (zoneId: string) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().removeZone(zoneId)
        return
      }
      await supabase.from('delivery_zones').delete().eq('id', zoneId)
      await reload()
    },
    [reload],
  )

  const setDefaultChannel = useCallback(
    async (channel: DeliveryChannel) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().setDefaultExternalChannel(channel)
        return
      }
      await supabase
        .from('app_settings')
        .upsert({ key: 'default_external_channel', value: channel })
      await reload()
    },
    [reload],
  )

  const setDeliveryFee = useCallback(
    async (fee: number) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().setDeliveryFee(fee)
        return
      }
      await supabase.from('app_settings').upsert({ key: 'delivery_fee', value: String(fee) })
      await reload()
    },
    [reload],
  )

  return {
    zones,
    route,
    coverageStatus: route.status,
    deliveryFee,
    defaultChannel,
    loading,
    toggleZone,
    updateZone,
    addZone,
    removeZone,
    setDefaultChannel,
    setDeliveryFee,
    reload,
  }
}
