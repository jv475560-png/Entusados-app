import { useCallback, useEffect, useState } from 'react'
import type { Supplier, SupplierOrder } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export interface CreateSupplierOrderInput {
  supplierId: string
  expectedAt?: string | null
  notes?: string
  lines: Array<{ ingredientId: string; qty: number; unitCost: number }>
}

export function useSuppliers() {
  const demoSuppliers = useDemoStore((state) => state.suppliers)
  const demoOrders = useDemoStore((state) => state.supplierOrders)
  const [suppliers, setSuppliers] = useState<Supplier[]>(
    isSupabaseEnabled ? [] : demoSuppliers,
  )
  const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>(
    isSupabaseEnabled ? [] : demoOrders,
  )

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const [suppliersRes, ordersRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('is_active', true).order('name'),
      supabase.from('supplier_orders').select('*').order('created_at', { ascending: false }),
    ])
    if (suppliersRes.data) setSuppliers(suppliersRes.data as Supplier[])
    if (ordersRes.data) setSupplierOrders(ordersRes.data as SupplierOrder[])
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setSuppliers(demoSuppliers)
      setSupplierOrders(demoOrders)
      return
    }
    void load()
  }, [demoSuppliers, demoOrders, load])

  const createSupplierOrder = useCallback(
    async (input: CreateSupplierOrderInput) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().createSupplierOrder(input)
        return
      }

      const total = input.lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0)
      const { data, error } = await supabase
        .from('supplier_orders')
        .insert({
          supplier_id: input.supplierId,
          expected_at: input.expectedAt ?? null,
          notes: input.notes ?? null,
          total,
        })
        .select('id')
        .single()

      if (!error && data) {
        await supabase.from('supplier_order_items').insert(
          input.lines.map((line) => ({
            supplier_order_id: (data as { id: string }).id,
            ingredient_id: line.ingredientId,
            qty: line.qty,
            unit_cost: line.unitCost,
          })),
        )
        await load()
      }
    },
    [load],
  )

  return { suppliers, supplierOrders, createSupplierOrder, refresh: load }
}
