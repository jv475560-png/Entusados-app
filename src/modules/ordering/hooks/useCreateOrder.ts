import { useCallback, useState } from 'react'
import type { Order, OrderItem } from '@/shared/types'
import type { CreateOrderChannel, CreateOrderPayload } from '@/modules/ordering/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'
import { ensureAnonymousSession } from '@/shared/services/auth'

export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createOrder = useCallback(async (payload: CreateOrderPayload): Promise<Order | null> => {
    setSubmitting(true)
    setError(null)

    try {
      if (!isSupabaseEnabled || !supabase) {
        return useDemoStore.getState().createOrder({
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          channel: payload.channel,
          paymentMethod: payload.paymentMethod,
          address: payload.deliveryAddress,
          lat: payload.deliveryLat,
          lng: payload.deliveryLng,
          neighborhood: payload.deliveryNeighborhood,
          notes: payload.notes,
          sessionToken: payload.sessionToken,
          items: payload.items,
        })
      }

      const customerId = await ensureAnonymousSession()
      const { data: created, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: customerId,
          session_token: payload.sessionToken ?? crypto.randomUUID(),
          customer_name: payload.customerName,
          customer_phone: payload.customerPhone,
          channel: payload.channel as CreateOrderChannel,
          payment_method: payload.paymentMethod,
          delivery_address: payload.deliveryAddress ?? null,
          delivery_lat: payload.deliveryLat ?? null,
          delivery_lng: payload.deliveryLng ?? null,
          delivery_neighborhood: payload.deliveryNeighborhood ?? null,
          notes: payload.notes ?? null,
        })
        .select('*')
        .single()

      if (orderError) throw new Error(orderError.message)

      const order = created as unknown as Order

      const items = payload.items.map((item) => {
        const toppingsTotal = item.toppings.reduce((sum, t) => sum + t.price, 0)
        return {
          order_id: order.id,
          product_id: item.product.id.startsWith('promo-') ? null : item.product.id,
          product_name: item.product.name,
          unit_price: item.product.price + toppingsTotal,
          quantity: item.quantity,
          toppings: item.toppings,
          notes: item.notes ?? null,
        }
      })

      const { error: itemsError } = await supabase.from('order_items').insert(items)
      if (itemsError) throw new Error(itemsError.message)

      const { data: full, error: fullError } = await supabase
        .from('orders')
        .select('*, items:order_items(*)')
        .eq('id', order.id)
        .single()

      if (fullError) throw new Error(fullError.message)

      return {
        ...(full as unknown as Order),
        items: (full as unknown as { items: OrderItem[] }).items ?? [],
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pudimos crear el pedido.')
      return null
    } finally {
      setSubmitting(false)
    }
  }, [])

  return { createOrder, submitting, error }
}
