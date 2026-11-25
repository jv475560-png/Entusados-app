import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CashClosure, Expense } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export function useCashClosure() {
  const demoClosures = useDemoStore((state) => state.closures)
  const demoExpenses = useDemoStore((state) => state.expenses)
  const [closures, setClosures] = useState<CashClosure[]>(
    isSupabaseEnabled ? [] : demoClosures,
  )
  const [expenses, setExpenses] = useState<Expense[]>(isSupabaseEnabled ? [] : demoExpenses)
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const [closuresRes, expensesRes] = await Promise.all([
      supabase.from('cash_closures').select('*').order('opened_at', { ascending: false }).limit(50),
      supabase.from('expenses').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    if (closuresRes.error) setError(closuresRes.error.message)
    else setClosures((closuresRes.data ?? []) as CashClosure[])
    if (!expensesRes.error) setExpenses((expensesRes.data ?? []) as Expense[])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setClosures(demoClosures)
      setExpenses(demoExpenses)
      setLoading(false)
      return
    }

    void load()
    const channel = supabase
      .channel(`cash-live-${instanceRef.current}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_closures' },
        () => void load(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [demoClosures, demoExpenses, load])

  const openClosure = useCallback(
    async (openingCash: number) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().openCashClosure(openingCash)
        return
      }
      const { error: err } = await supabase
        .from('cash_closures')
        .insert({ opening_cash: openingCash })
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const addExpense = useCallback(
    async (closureId: string, concept: string, amount: number, category = 'operativo') => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().addExpense(closureId, concept, amount, category)
        return
      }
      const { error: err } = await supabase.from('expenses').insert({
        cash_closure_id: closureId,
        concept,
        amount,
        category,
      })
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const closeClosure = useCallback(
    async (closureId: string, closingCash: number, notes?: string) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().closeCashClosure(closureId, closingCash, notes)
        return
      }
      const { error: err } = await supabase
        .from('cash_closures')
        .update({
          closing_cash: closingCash,
          closed_at: new Date().toISOString(),
          notes: notes ?? null,
        })
        .eq('id', closureId)
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const activeClosure = useMemo(
    () => closures.find((closure) => !closure.closed_at) ?? null,
    [closures],
  )

  const activeExpenses = useMemo(
    () => (activeClosure ? expenses.filter((e) => e.cash_closure_id === activeClosure.id) : []),
    [activeClosure, expenses],
  )

  return {
    closures,
    expenses,
    activeClosure,
    activeExpenses,
    loading,
    error,
    openClosure,
    addExpense,
    closeClosure,
    refresh: load,
  }
}
