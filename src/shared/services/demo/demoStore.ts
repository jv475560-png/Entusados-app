import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  CashClosure,
  ChatMessage,
  DeliveryChannel,
  DeliveryZone,
  Expense,
  Ingredient,
  Order,
  OrderChannel,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentNotification,
  PaymentProvider,
  Product,
  Promotion,
  Supplier,
  SupplierOrder,
  Topping,
  UserRole,
} from '@/shared/types'
import type { ShiftChecklist, ShiftType } from '@/modules/shift-checklist/types'
import { uid } from '@/shared/lib/format'
import { orderChannelToDelivery } from '@/shared/lib/schedule'
import { resolveCoverageRoute } from '@/shared/lib/coverage'
import {
  buildSeedOrders,
  demoIngredients,
  demoProducts,
  demoPromotions,
  demoRecipes,
  demoSuppliers,
  demoZones,
  seedMessages,
  seedNotifications,
  seedOrderItems,
} from './demoData'

export interface CreateOrderInput {
  customerName: string
  customerPhone: string
  channel: OrderChannel
  paymentMethod: PaymentMethod
  address?: string
  lat?: number
  lng?: number
  neighborhood?: string
  notes?: string
  sessionToken?: string
  customerId?: string | null
  items: Array<{
    product: Product
    quantity: number
    toppings: Topping[]
    notes?: string
  }>
}

interface DemoState {
  products: Product[]
  ingredients: Ingredient[]
  recipes: typeof demoRecipes
  suppliers: Supplier[]
  zones: DeliveryZone[]
  promotions: Promotion[]
  orders: Order[]
  orderItems: OrderItem[]
  notifications: PaymentNotification[]
  messages: ChatMessage[]
  closures: CashClosure[]
  expenses: Expense[]
  supplierOrders: SupplierOrder[]
  shiftChecklists: ShiftChecklist[]
  settings: {
    deliveryFee: number
    defaultExternalChannel: DeliveryChannel
    storeName: string
  }
  createOrder: (input: CreateOrderInput) => Order
  updateOrderStatus: (orderId: string, status: OrderStatus) => void
  setOrderPaymentStatus: (orderId: string, status: Order['payment_status']) => void
  adjustStock: (ingredientId: string, delta: number) => void
  setStock: (ingredientId: string, quantity: number) => void
  toggleZone: (zoneId: string) => void
  updateZone: (zoneId: string, patch: Partial<DeliveryZone>) => void
  addZone: (zone: Omit<DeliveryZone, 'id'>) => void
  removeZone: (zoneId: string) => void
  addPromotion: (promotion: Omit<Promotion, 'id' | 'created_at'>) => void
  updatePromotion: (promotionId: string, patch: Partial<Promotion>) => void
  removePromotion: (promotionId: string) => void
  togglePromotion: (promotionId: string) => void
  setDefaultExternalChannel: (channel: DeliveryChannel) => void
  setDeliveryFee: (fee: number) => void
  simulatePayment: (input: {
    orderId?: string | null
    orderCode?: string | null
    provider: PaymentProvider
    amount: number
    reference?: string
    senderName?: string
  }) => PaymentNotification
  confirmPayment: (notificationId: string, confirm: boolean) => void
  openCashClosure: (openingCash: number) => CashClosure
  addExpense: (closureId: string, concept: string, amount: number, category?: string) => void
  closeCashClosure: (closureId: string, closingCash: number, notes?: string) => void
  sendMessage: (
    orderId: string,
    role: ChatMessage['sender_role'],
    name: string,
    body: string,
  ) => void
  createSupplierOrder: (input: {
    supplierId: string
    expectedAt?: string | null
    notes?: string
    lines: Array<{ ingredientId: string; qty: number; unitCost: number }>
  }) => SupplierOrder
  registerChecklist: (input: {
    shiftType: ShiftType
    itemsChecked: string[]
    itemsTotal: number
    notes?: string
    userId?: string | null
    userName: string
    userRole: UserRole | null
  }) => ShiftChecklist
  resetDemo: () => void
}

function nextOrderCode(orders: Order[]): string {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  const stamp = `${get('year')}${get('month')}${get('day')}`
  const next = orders.length + 1
  return `ENT-${stamp}-${String(next).padStart(4, '0')}`
}

function seedItems(): OrderItem[] {
  return seedOrderItems.map((item, index) => ({
    ...item,
    id: `oi-${index + 1}`,
    toppings: item.toppings as Topping[],
    created_at: new Date(Date.now() - (40 - index) * 60000).toISOString(),
  }))
}

function initialClosures(): CashClosure[] {
  return [
    {
      id: 'cc-1',
      opened_by: 'demo-admin',
      closed_by: null,
      opened_at: new Date(new Date().setHours(7, 0, 0, 0)).toISOString(),
      closed_at: null,
      opening_cash: 150000,
      closing_cash: null,
      cash_income: 0,
      digital_income: 0,
      expenses_total: 0,
      expected_cash: 150000,
      difference: null,
      net_profit: 0,
      notes: 'Turno mañana',
    },
  ]
}

function initialState() {
  return {
    products: demoProducts,
    ingredients: demoIngredients,
    recipes: demoRecipes,
    suppliers: demoSuppliers,
    zones: demoZones,
    promotions: demoPromotions,
    orders: buildSeedOrders(),
    orderItems: seedItems(),
    notifications: seedNotifications,
    messages: seedMessages,
    closures: initialClosures(),
    expenses: [] as Expense[],
    supplierOrders: [] as SupplierOrder[],
    shiftChecklists: [] as ShiftChecklist[],
    settings: {
      deliveryFee: 3500,
      defaultExternalChannel: 'rappi' as DeliveryChannel,
      storeName: 'ENTUSADOS',
    },
  }
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...initialState(),

      createOrder: (input) => {
        const state = get()
        const route = resolveCoverageRoute(
          state.zones,
          {
            lat: input.lat ?? null,
            lng: input.lng ?? null,
            neighborhood: input.neighborhood ?? null,
            address: input.address ?? null,
          },
          state.settings.defaultExternalChannel,
        )
        const isDelivery = ['own_delivery', 'rappi', 'didi'].includes(input.channel)

        let channel = input.channel
        let channelSource: Order['channel_source'] = 'manual'
        let zoneId: string | null = null
        let zoneName: string | null = null
        let deliveryFee = 0

        if (isDelivery) {
          if (route.handling === 'front') {
            channel = 'front_delivery'
            channelSource = 'front'
          } else {
            channel = orderChannelToDelivery(route.channel)
            channelSource = route.is_fallback ? 'fallback' : 'coverage'
          }
          zoneId = route.zone_id
          zoneName = route.zone_name
          deliveryFee = state.settings.deliveryFee
        }

        const lines = input.items.map((item) => {
          const toppingsTotal = item.toppings.reduce((sum, t) => sum + t.price, 0)
          const unitPrice = item.product.price + toppingsTotal
          return {
            product: item.product,
            quantity: item.quantity,
            toppings: item.toppings,
            notes: item.notes ?? null,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          }
        })

        const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0)
        const createdAt = new Date().toISOString()
        const orderId = uid('o')
        const order: Order = {
          id: orderId,
          code: nextOrderCode(state.orders),
          customer_id: input.customerId ?? null,
          session_token: input.sessionToken ?? uid('sess'),
          customer_name: input.customerName || 'Cliente',
          customer_phone: input.customerPhone || null,
          channel,
          status: 'pending',
          payment_method: input.paymentMethod,
          payment_status: input.paymentMethod === 'cash' ? 'confirmed' : 'pending',
          delivery_address: input.address ?? null,
          delivery_lat: input.lat ?? null,
          delivery_lng: input.lng ?? null,
          delivery_neighborhood: input.neighborhood ?? null,
          delivery_zone_id: zoneId,
          delivery_zone_name: zoneName,
          subtotal,
          delivery_fee: deliveryFee,
          total: subtotal + deliveryFee,
          notes: input.notes ?? null,
          channel_source: channelSource,
          created_at: createdAt,
          accepted_at: null,
          ready_at: null,
          delivered_at: null,
          updated_at: createdAt,
        }

        const items: OrderItem[] = lines.map((line) => ({
          id: uid('oi'),
          order_id: orderId,
          product_id: line.product.id,
          product_name: line.product.name,
          unit_price: line.unitPrice,
          quantity: line.quantity,
          toppings: line.toppings,
          notes: line.notes,
          line_total: line.lineTotal,
          created_at: createdAt,
        }))

        // Descuento de inventario por receta (equivalente al trigger SQL)
        const ingredients = state.ingredients.map((ingredient) => {
          let consumed = 0
          for (const line of lines) {
            for (const recipe of state.recipes) {
              if (
                recipe.product_id === line.product.id &&
                recipe.ingredient_id === ingredient.id
              ) {
                consumed += recipe.qty * line.quantity
              }
            }
            for (const topping of line.toppings) {
              if (topping.ingredient_id === ingredient.id && topping.ingredient_qty) {
                consumed += topping.ingredient_qty * line.quantity
              }
            }
          }
          return consumed > 0
            ? { ...ingredient, stock_qty: ingredient.stock_qty - consumed }
            : ingredient
        })

        set({
          orders: [order, ...state.orders],
          orderItems: [...items, ...state.orderItems],
          ingredients,
        })

        return { ...order, items }
      },

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((order) => {
            if (order.id !== orderId) return order
            const patch: Partial<Order> = { status, updated_at: new Date().toISOString() }
            if (status === 'preparing' && !order.accepted_at) patch.accepted_at = new Date().toISOString()
            if (status === 'ready' && !order.ready_at) patch.ready_at = new Date().toISOString()
            if (status === 'delivered') {
              patch.delivered_at = new Date().toISOString()
              if (order.payment_method === 'cash') patch.payment_status = 'confirmed'
            }
            return { ...order, ...patch }
          }),
        })),

      setOrderPaymentStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, payment_status: status } : order,
          ),
        })),

      adjustStock: (ingredientId, delta) =>
        set((state) => ({
          ingredients: state.ingredients.map((ingredient) =>
            ingredient.id === ingredientId
              ? { ...ingredient, stock_qty: ingredient.stock_qty + delta }
              : ingredient,
          ),
        })),

      setStock: (ingredientId, quantity) =>
        set((state) => ({
          ingredients: state.ingredients.map((ingredient) =>
            ingredient.id === ingredientId
              ? { ...ingredient, stock_qty: Math.max(0, quantity) }
              : ingredient,
          ),
        })),

      toggleZone: (zoneId) =>
        set((state) => ({
          zones: state.zones.map((zone) =>
            zone.id === zoneId ? { ...zone, is_active: !zone.is_active } : zone,
          ),
        })),

      updateZone: (zoneId, patch) =>
        set((state) => ({
          zones: state.zones.map((zone) => (zone.id === zoneId ? { ...zone, ...patch } : zone)),
        })),

      addZone: (zone) =>
        set((state) => ({
          zones: [...state.zones, { ...zone, id: uid('zone') }],
        })),

      removeZone: (zoneId) =>
        set((state) => ({ zones: state.zones.filter((zone) => zone.id !== zoneId) })),

      addPromotion: (promotion) =>
        set((state) => ({
          promotions: [
            ...state.promotions,
            { ...promotion, id: uid('promo'), created_at: new Date().toISOString() },
          ],
        })),

      updatePromotion: (promotionId, patch) =>
        set((state) => ({
          promotions: state.promotions.map((promotion) =>
            promotion.id === promotionId ? { ...promotion, ...patch } : promotion,
          ),
        })),

      removePromotion: (promotionId) =>
        set((state) => ({
          promotions: state.promotions.filter((promotion) => promotion.id !== promotionId),
        })),

      togglePromotion: (promotionId) =>
        set((state) => ({
          promotions: state.promotions.map((promotion) =>
            promotion.id === promotionId
              ? { ...promotion, is_active: !promotion.is_active }
              : promotion,
          ),
        })),

      setDefaultExternalChannel: (channel) =>
        set((state) => ({
          settings: { ...state.settings, defaultExternalChannel: channel },
        })),

      setDeliveryFee: (fee) =>
        set((state) => ({ settings: { ...state.settings, deliveryFee: fee } })),

      simulatePayment: (input) => {
        const state = get()
        const order =
          state.orders.find((o) => o.id === input.orderId) ??
          state.orders.find((o) => o.code === input.orderCode) ??
          null

        const notification: PaymentNotification = {
          id: uid('pn'),
          order_id: order?.id ?? null,
          order_code: input.orderCode ?? order?.code ?? null,
          provider: input.provider,
          amount: input.amount,
          reference: input.reference ?? order?.code ?? null,
          sender_name: input.senderName ?? order?.customer_name ?? null,
          raw_payload: { source: 'simulator', provider: input.provider },
          status: 'pending',
          received_at: new Date().toISOString(),
          confirmed_at: null,
          confirmed_by: null,
        }

        set({ notifications: [notification, ...state.notifications] })
        return notification
      },

      confirmPayment: (notificationId, confirm) => {
        const state = get()
        const notification = state.notifications.find((n) => n.id === notificationId)
        if (!notification) return
        const now = new Date().toISOString()

        set({
          notifications: state.notifications.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  status: confirm ? 'confirmed' : 'rejected',
                  confirmed_at: now,
                  confirmed_by: 'demo-staff',
                }
              : n,
          ),
          orders: notification.order_id
            ? state.orders.map((o) =>
                o.id === notification.order_id
                  ? { ...o, payment_status: confirm ? 'confirmed' : 'rejected' }
                  : o,
              )
            : state.orders,
        })
      },

      openCashClosure: (openingCash) => {
        const closure: CashClosure = {
          id: uid('cc'),
          opened_by: 'demo-cashier',
          closed_by: null,
          opened_at: new Date().toISOString(),
          closed_at: null,
          opening_cash: openingCash,
          closing_cash: null,
          cash_income: 0,
          digital_income: 0,
          expenses_total: 0,
          expected_cash: openingCash,
          difference: null,
          net_profit: 0,
          notes: null,
        }
        set((state) => ({ closures: [closure, ...state.closures] }))
        return closure
      },

      addExpense: (closureId, concept, amount, category = 'operativo') => {
        const expense: Expense = {
          id: uid('ex'),
          cash_closure_id: closureId,
          concept,
          category,
          amount,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ expenses: [expense, ...state.expenses] }))
      },

      closeCashClosure: (closureId, closingCash, notes) => {
        const state = get()
        const closure = state.closures.find((c) => c.id === closureId)
        if (!closure) return

        const closedAt = new Date().toISOString()
        const inRange = state.orders.filter(
          (order) =>
            order.payment_status === 'confirmed' &&
            new Date(order.created_at) >= new Date(closure.opened_at) &&
            new Date(order.created_at) <= new Date(closedAt),
        )
        const cashIncome = inRange
          .filter((o) => o.payment_method === 'cash')
          .reduce((sum, o) => sum + o.total, 0)
        const digitalIncome = inRange
          .filter((o) => o.payment_method !== 'cash')
          .reduce((sum, o) => sum + o.total, 0)
        const expensesTotal = state.expenses
          .filter((e) => e.cash_closure_id === closureId)
          .reduce((sum, e) => sum + e.amount, 0)
        const expectedCash = closure.opening_cash + cashIncome - expensesTotal

        set({
          closures: state.closures.map((c) =>
            c.id === closureId
              ? {
                  ...c,
                  closed_by: 'demo-admin',
                  closed_at: closedAt,
                  closing_cash: closingCash,
                  cash_income: cashIncome,
                  digital_income: digitalIncome,
                  expenses_total: expensesTotal,
                  expected_cash: expectedCash,
                  difference: closingCash - expectedCash,
                  net_profit: cashIncome + digitalIncome - expensesTotal,
                  notes: notes ?? c.notes,
                }
              : c,
          ),
        })
      },

      sendMessage: (orderId, role, name, body) => {
        const message: ChatMessage = {
          id: uid('msg'),
          order_id: orderId,
          sender_role: role,
          sender_name: name,
          body,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ messages: [...state.messages, message] }))
      },

      createSupplierOrder: (input) => {
        const total = input.lines.reduce((sum, l) => sum + l.qty * l.unitCost, 0)
        const order: SupplierOrder = {
          id: uid('so'),
          supplier_id: input.supplierId,
          status: 'draft',
          expected_at: input.expectedAt ?? null,
          total,
          notes: input.notes ?? null,
          created_at: new Date().toISOString(),
          received_at: null,
        }
        set((state) => ({ supplierOrders: [order, ...state.supplierOrders] }))
        return order
      },

      registerChecklist: (input) => {
        const checklist: ShiftChecklist = {
          id: uid('sc'),
          shift_type: input.shiftType,
          user_id: input.userId ?? null,
          user_name: input.userName,
          user_role: input.userRole,
          items_checked: input.itemsChecked,
          items_total: input.itemsTotal,
          notes: input.notes?.trim() || null,
          created_at: new Date().toISOString(),
        }
        set((state) => ({ shiftChecklists: [checklist, ...state.shiftChecklists] }))
        return checklist
      },

      resetDemo: () => set(initialState()),
    }),
    {
      name: 'entusados-demo-v1',
      version: 12,
      migrate: (persisted, version) => {
        const base = initialState()
        if (version < 3) {
          return {
            ...base,
            ...(persisted as Record<string, unknown>),
            products: demoProducts,
            ingredients: demoIngredients,
            recipes: demoRecipes,
            promotions: demoPromotions,
            zones: demoZones,
            orders: base.orders,
            orderItems: base.orderItems,
            notifications: base.notifications,
            messages: base.messages,
          } as DemoState
        }
        if (version < 7) {
          return {
            ...base,
            ...(persisted as Record<string, unknown>),
            products: demoProducts,
            recipes: demoRecipes,
            promotions: demoPromotions,
            settings: { ...base.settings, deliveryFee: 3500 },
          } as DemoState
        }
        if (version < 8) {
          const previous = persisted as Record<string, unknown>
          const previousSettings = (previous.settings ?? {}) as Record<string, unknown>
          return {
            ...base,
            ...previous,
            promotions: demoPromotions,
            settings: { ...base.settings, ...previousSettings, deliveryFee: 3500 },
          } as DemoState
        }
        if (version < 12) {
          return {
            ...base,
            ...(persisted as Record<string, unknown>),
            products: demoProducts,
            promotions: demoPromotions,
          } as DemoState
        }
        return persisted as DemoState
      },
      partialize: (state) => ({
        products: state.products,
        ingredients: state.ingredients,
        recipes: state.recipes,
        suppliers: state.suppliers,
        zones: state.zones,
        promotions: state.promotions,
        orders: state.orders,
        orderItems: state.orderItems,
        notifications: state.notifications,
        messages: state.messages,
        closures: state.closures,
        expenses: state.expenses,
        supplierOrders: state.supplierOrders,
        shiftChecklists: state.shiftChecklists,
        settings: state.settings,
      }),
    },
  ),
)

export function selectLowStock(state: DemoState): Ingredient[] {
  return state.ingredients.filter((ingredient) => ingredient.stock_qty <= ingredient.min_stock)
}
