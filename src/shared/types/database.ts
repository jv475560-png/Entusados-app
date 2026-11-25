export type UserRole = 'customer' | 'cashier' | 'kitchen' | 'admin'

export type ProductCategory =
  | 'elotes'
  | 'espiropapas'
  | 'hamburguesas'
  | 'arepas'
  | 'bebidas'
  | 'adiciones'

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export type OrderChannel =
  | 'dine_in'
  | 'pickup'
  | 'local'
  | 'own_delivery'
  | 'front_delivery'
  | 'rappi'
  | 'didi'

export type DeliveryChannel = 'own' | 'rappi' | 'didi'

export type PaymentMethod = 'cash' | 'bre_b' | 'nequi' | 'daviplata' | 'bancolombia' | 'card'

export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'

export type PaymentProvider = 'nequi' | 'daviplata' | 'bancolombia' | 'bre_b'

export interface Profile {
  id: string
  full_name: string
  phone: string | null
  role: UserRole
  created_at: string
}

export interface Supplier {
  id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  lead_time_days: number
  notes: string | null
  is_active: boolean
}

export interface Ingredient {
  id: string
  name: string
  unit: string
  stock_qty: number
  min_stock: number
  cost_per_unit: number
  supplier_id: string | null
  is_active: boolean
  updated_at?: string
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  category: ProductCategory
  price: number
  image_url: string | null
  prep_minutes: number
  is_active: boolean
  is_featured: boolean
}

export interface RecipeBom {
  product_id: string
  ingredient_id: string
  qty: number
}

export type DeliveryHandling = 'own' | 'front'

export interface DeliveryZone {
  id: string
  name: string
  aliases: string[]
  center_lat: number | null
  center_lng: number | null
  radius_m: number
  handling: DeliveryHandling
  is_active: boolean
  created_at?: string
}

export type CoverageStatus = 'inside' | 'outside' | 'unknown'

export interface CoverageRoute {
  channel: DeliveryChannel
  handling: DeliveryHandling
  zone_id: string | null
  zone_name: string | null
  is_fallback: boolean
  status: CoverageStatus
}

export interface Promotion {
  id: string
  title: string
  description: string
  price: number
  emoji: string
  image_url: string | null
  badge: string
  cta_label: string
  only_at_store: boolean
  is_active: boolean
  sort_order: number
  created_at?: string
}

export interface Topping {
  id: string
  name: string
  price: number
  ingredient_id?: string
  ingredient_qty?: number
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string | null
  product_name: string
  unit_price: number
  quantity: number
  toppings: Topping[]
  notes: string | null
  line_total: number
  created_at?: string
}

export interface Order {
  id: string
  code: string
  customer_id: string | null
  session_token: string
  customer_name: string
  customer_phone: string | null
  channel: OrderChannel
  status: OrderStatus
  payment_method: PaymentMethod
  payment_status: PaymentStatus
  delivery_address: string | null
  delivery_lat: number | null
  delivery_lng: number | null
  delivery_neighborhood: string | null
  delivery_zone_id: string | null
  delivery_zone_name: string | null
  subtotal: number
  delivery_fee: number
  total: number
  notes: string | null
  channel_source: 'coverage' | 'front' | 'manual' | 'fallback'
  created_at: string
  accepted_at: string | null
  ready_at: string | null
  delivered_at: string | null
  updated_at: string
  items?: OrderItem[]
}

export interface PaymentNotification {
  id: string
  order_id: string | null
  order_code: string | null
  provider: PaymentProvider
  amount: number
  reference: string | null
  sender_name: string | null
  raw_payload: Record<string, unknown>
  status: PaymentStatus
  received_at: string
  confirmed_at: string | null
  confirmed_by: string | null
}

export interface ChatMessage {
  id: string
  order_id: string
  sender_role: 'customer' | 'store' | 'courier' | 'system'
  sender_name: string
  body: string
  created_at: string
}

export interface StockAlert {
  id: string
  ingredient_id: string
  stock_qty: number
  min_stock: number
  created_at: string
  resolved_at: string | null
}

export interface Expense {
  id: string
  cash_closure_id: string
  concept: string
  category: string
  amount: number
  created_at: string
}

export interface CashClosure {
  id: string
  opened_by: string | null
  closed_by: string | null
  opened_at: string
  closed_at: string | null
  opening_cash: number
  closing_cash: number | null
  cash_income: number
  digital_income: number
  expenses_total: number
  expected_cash: number
  difference: number | null
  net_profit: number
  notes: string | null
}

export interface SupplierOrder {
  id: string
  supplier_id: string
  status: 'draft' | 'sent' | 'received' | 'cancelled'
  expected_at: string | null
  total: number
  notes: string | null
  created_at: string
  received_at: string | null
}

export interface CartItem {
  key: string
  product: Product
  quantity: number
  toppings: Topping[]
  notes: string
  unitPrice: number
  lineTotal: number
}

export interface GeoPosition {
  lat: number
  lng: number
  accuracy: number
  timestamp: number
}

export interface ReverseGeocodeResult {
  address: string
  city: string
  neighborhood: string
}
