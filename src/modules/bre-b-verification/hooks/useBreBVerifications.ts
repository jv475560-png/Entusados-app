import { useCallback, useEffect, useRef, useState } from 'react'
import type { PaymentNotification, PaymentProvider } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export interface SimulatePaymentInput {
  orderId?: string | null
  orderCode?: string | null
  provider: PaymentProvider
  amount: number
  reference?: string
  senderName?: string
}

/**
 * Listener de notificaciones Bre-B / bancos.
 * - Producción: Realtime sobre `payment_notifications` + RPC `fn_confirm_payment`.
 * - Demo: simulador local con la misma semántica.
 */
export function useBreBVerifications(orderId?: string) {
  const demoNotifications = useDemoStore((state) => state.notifications)
  const [notifications, setNotifications] = useState<PaymentNotification[]>(
    isSupabaseEnabled ? [] : demoNotifications,
  )
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [error, setError] = useState<string | null>(null)
  const instanceRef = useRef(Math.random().toString(36).slice(2, 8))

  const load = useCallback(async () => {
    if (!isSupabaseEnabled || !supabase) return
    let query = supabase
      .from('payment_notifications')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(100)

    if (orderId) query = query.eq('order_id', orderId)

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setNotifications((data ?? []) as PaymentNotification[])
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      setNotifications(
        orderId
          ? demoNotifications.filter((notification) => notification.order_id === orderId)
          : demoNotifications,
      )
      setLoading(false)
      return
    }

    void load()
    const channel = supabase
      .channel(`bre-b-${orderId ?? 'staff'}-${instanceRef.current}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_notifications',
          ...(orderId ? { filter: `order_id=eq.${orderId}` } : {}),
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [orderId, demoNotifications, load])

  const simulate = useCallback(
    async (input: SimulatePaymentInput) => {
      if (!isSupabaseEnabled || !supabase) {
        return useDemoStore.getState().simulatePayment(input)
      }

      const { data, error: err } = await supabase
        .from('payment_notifications')
        .insert({
          order_id: input.orderId ?? null,
          order_code: input.orderCode ?? null,
          provider: input.provider,
          amount: input.amount,
          reference: input.reference ?? input.orderCode ?? null,
          sender_name: input.senderName ?? null,
          raw_payload: { source: 'admin-simulator' },
        })
        .select('*')
        .single()

      if (err) setError(err.message)
      else await load()
      return data as PaymentNotification | null
    },
    [load],
  )

  const confirm = useCallback(
    async (notificationId: string, approve: boolean) => {
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().confirmPayment(notificationId, approve)
        return
      }

      const { error: err } = await supabase.rpc('fn_confirm_payment', {
        p_notification_id: notificationId,
        p_confirm: approve,
      })
      if (err) setError(err.message)
      else await load()
    },
    [load],
  )

  const pending = notifications.filter((notification) => notification.status === 'pending')

  return { notifications, pending, loading, error, simulate, confirm, refresh: load }
}
