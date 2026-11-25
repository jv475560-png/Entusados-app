import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ShiftChecklist, ShiftType } from '../types'
import { checklistItems } from '../types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'
import { useAuthStore } from '@/shared/services/auth'
import { bogotaDateKey } from '@/shared/lib/schedule'

export function useShiftChecklists() {
  const demoChecklists = useDemoStore((state) => state.shiftChecklists)
  const fullName = useAuthStore((state) => state.fullName)
  const role = useAuthStore((state) => state.role)
  const userId = useAuthStore((state) => state.userId)

  const [checklists, setChecklists] = useState<ShiftChecklist[]>(
    isSupabaseEnabled ? [] : demoChecklists,
  )
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const { data, error: err } = await supabase
      .from('shift_checklists')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    if (err) setError(err.message)
    else setChecklists((data ?? []) as ShiftChecklist[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setChecklists(demoChecklists)
      setLoading(false)
      return
    }

    void load()
    const channel = supabase
      .channel(`shift-checklists-live-${instanceRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shift_checklists' },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [demoChecklists, load])

  const register = useCallback(
    async (shiftType: ShiftType, itemsChecked: string[], notes?: string) => {
      const itemsTotal = checklistItems(shiftType).length

      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().registerChecklist({
          shiftType,
          itemsChecked,
          itemsTotal,
          notes,
          userId,
          userName: fullName,
          userRole: role,
        })
        return true
      }

      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) {
        setError('Debes iniciar sesión como staff para registrar el checklist.')
        return false
      }

      const { error: err } = await supabase.from('shift_checklists').insert({
        shift_type: shiftType,
        user_id: authData.user.id,
        user_name: fullName,
        user_role: role,
        items_checked: itemsChecked,
        items_total: itemsTotal,
        notes: notes?.trim() || null,
      })

      if (err) {
        setError(err.message)
        return false
      }
      await load()
      return true
    },
    [fullName, role, userId, load],
  )

  const todayKey = bogotaDateKey()
  const todayChecklists = useMemo(
    () => checklists.filter((checklist) => bogotaDateKey(checklist.created_at) === todayKey),
    [checklists, todayKey],
  )

  const lastOpening = todayChecklists.find((checklist) => checklist.shift_type === 'OPENING')
  const lastClosing = todayChecklists.find((checklist) => checklist.shift_type === 'CLOSING')

  const shiftOpen = Boolean(
    lastOpening && (!lastClosing || lastOpening.created_at > lastClosing.created_at),
  )
  const closingComplete = Boolean(
    lastClosing && (!lastOpening || lastClosing.created_at >= lastOpening.created_at),
  )

  return {
    checklists,
    todayChecklists,
    lastOpening: lastOpening ?? null,
    lastClosing: lastClosing ?? null,
    shiftOpen,
    openingComplete: shiftOpen,
    closingComplete,
    loading,
    error,
    register,
    refresh: load,
  }
}
