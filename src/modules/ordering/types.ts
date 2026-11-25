export interface CreateOrderPayload {
  customerName: string
  customerPhone: string
  channel: CreateOrderChannel
  paymentMethod: import('@/shared/types').PaymentMethod
  sessionToken?: string
  notes?: string
  deliveryAddress?: string
  deliveryLat?: number
  deliveryLng?: number
  deliveryNeighborhood?: string
  items: Array<{
    product: import('@/shared/types').Product
    quantity: number
    toppings: import('@/shared/types').Topping[]
    notes?: string
  }>
}

export type CreateOrderChannel =
  | 'local'
  | 'dine_in'
  | 'pickup'
  | 'own_delivery'
  | 'front_delivery'
  | 'rappi'
  | 'didi'
