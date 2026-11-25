import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Order, OrderStatus } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

function sortOrders(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
}

export function useOrders() {
  const demoOrders = useDemoStore((state) => state.orders)
  const demoItems = useDemoStore((state) => state.orderItems)
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    const { data, error: err } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (err) setError(err.message)
    else setOrders(sortOrders((data ?? []) as unknown as Order[]))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      const merged = demoOrders.map((order) => ({
        ...order,
        items: demoItems.filter((item) => item.order_id === order.id),
      }))
      setOrders(sortOrders(merged))
      setLoading(false)
      return
    }

    void load()
    const channel = supabase
      .channel(`orders-live-${instanceRef.current}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => void load())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [demoOrders, demoItems, load])

  const updateStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().updateOrderStatus(orderId, status)
        return
      }

      const patch: Record<string, unknown> = { status }
      if (status === 'preparing') patch.accepted_at = new Date().toISOString()
      if (status === 'ready') patch.ready_at = new Date().toISOString()
      if (status === 'delivered') patch.delivered_at = new Date().toISOString()

      const { error: err } = await supabase.from('orders').update(patch).eq('id', orderId)
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const activeOrders = useMemo(
    () => orders.filter((order) => order.status !== 'delivered' && order.status !== 'cancelled'),
    [orders],
  )

  return { orders, activeOrders, loading, error, updateStatus, refresh: load }
}

export function useOrder(orderId: string | undefined) {
  const { orders, loading, error, updateStatus } = useOrders()
  const order = useMemo(() => orders.find((o) => o.id === orderId), [orders, orderId])
  return { order, loading, error, updateStatus }
}
