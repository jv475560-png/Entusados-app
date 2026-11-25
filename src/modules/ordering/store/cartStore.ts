import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, Product, Topping } from '@/shared/types'

export type Fulfillment = 'delivery' | 'local'

interface CartState {
  items: CartItem[]
  fulfillment: Fulfillment
  orderNotes: string
  addItem: (product: Product, quantity: number, toppings: Topping[], notes?: string) => void
  updateQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  setFulfillment: (fulfillment: Fulfillment) => void
  setOrderNotes: (notes: string) => void
  clear: () => void
}

function makeKey(productId: string, toppings: Topping[], notes = ''): string {
  const toppingKey = [...toppings]
    .map((t) => t.id)
    .sort()
    .join('+')
  return `${productId}|${toppingKey}|${notes.trim().toLowerCase()}`
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      fulfillment: 'delivery',
      orderNotes: '',

      addItem: (product, quantity, toppings, notes = '') => {
        const key = makeKey(product.id, toppings, notes)
        const unitPrice = product.price + toppings.reduce((sum, t) => sum + t.price, 0)

        set((state) => {
          const existing = state.items.find((item) => item.key === key)
          if (existing) {
            const nextQty = existing.quantity + quantity
            return {
              items: state.items.map((item) =>
                item.key === key
                  ? { ...item, quantity: nextQty, lineTotal: nextQty * item.unitPrice }
                  : item,
              ),
            }
          }
          const item: CartItem = {
            key,
            product,
            quantity,
            toppings,
            notes,
            unitPrice,
            lineTotal: unitPrice * quantity,
          }
          return { items: [...state.items, item] }
        })
      },

      updateQuantity: (key, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.key !== key)
              : state.items.map((item) =>
                  item.key === key
                    ? { ...item, quantity, lineTotal: item.unitPrice * quantity }
                    : item,
                ),
        })),

      removeItem: (key) =>
        set((state) => ({ items: state.items.filter((item) => item.key !== key) })),

      setFulfillment: (fulfillment) => set({ fulfillment }),
      setOrderNotes: (orderNotes) => set({ orderNotes }),
      clear: () => set({ items: [], orderNotes: '' }),
    }),
    { name: 'entusados-cart-v2' },
  ),
)

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.lineTotal, 0)
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

export { makeKey }
