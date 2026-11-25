import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  Minus,
  Plus,
  Printer,
  Search,
  Smartphone,
  Store,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import { useProducts } from '@/modules/ordering/hooks/useProducts'
import { useCreateOrder } from '@/modules/ordering/hooks/useCreateOrder'
import { usePosCart } from '@/modules/pos-terminal/hooks/usePosCart'
import { ProductTile } from '@/modules/pos-terminal/components/ProductTile'
import { useOrders } from '@/modules/ordering/hooks/useOrders'
import { useShiftChecklists } from '@/modules/shift-checklist/hooks/useShiftChecklists'
import { OpeningChecklistModal } from '@/modules/shift-checklist/components/ChecklistModals'
import { CATEGORY_LABELS } from '@/modules/ordering/toppings'
import { useAuthStore } from '@/shared/services/auth'
import { isSupabaseEnabled } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'
import { formatCOP } from '@/shared/lib/format'
import type { Order, PaymentMethod, PaymentProvider } from '@/shared/types'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Modal } from '@/shared/ui/Modal'
import { StatusBadge } from '@/shared/ui/OrderMeta'

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: 'cash', label: 'Efectivo', icon: Banknote },
  { value: 'bre_b', label: 'Bre-B', icon: Smartphone },
  { value: 'nequi', label: 'Nequi', icon: Smartphone },
  { value: 'daviplata', label: 'Daviplata', icon: Smartphone },
  { value: 'bancolombia', label: 'Bancolombia', icon: CreditCard },
]

function toProvider(method: PaymentMethod): PaymentProvider {
  if (method === 'nequi' || method === 'daviplata' || method === 'bancolombia') return method
  return 'bre_b'
}

export function PosPage() {
  const { products, loading } = useProducts()
  const { orders, updateStatus } = useOrders()
  const cart = usePosCart()
  const { createOrder, submitting, error } = useCreateOrder()
  const fullName = useAuthStore((state) => state.fullName)
  const { shiftOpen, lastOpening } = useShiftChecklists()

  const [openChecklist, setOpenChecklist] = useState(false)
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [channel, setChannel] = useState<'dine_in' | 'pickup'>('dine_in')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [customerName, setCustomerName] = useState('')
  const [created, setCreated] = useState<Order | null>(null)

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((product) => product.category)))
    return ['all', ...unique]
  }, [products])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return products.filter(
      (product) =>
        (category === 'all' || product.category === category) &&
        (!term || product.name.toLowerCase().includes(term)),
    )
  }, [products, category, query])

  const activeOrders = orders.filter(
    (order) => order.status !== 'delivered' && order.status !== 'cancelled',
  )
  const frontOrders = activeOrders.filter((order) => order.channel === 'front_delivery')

  const checkout = async () => {
    if (cart.lines.length === 0) return
    const order = await createOrder({
      customerName: customerName.trim() || 'Cliente mostrador',
      customerPhone: '',
      channel,
      paymentMethod,
      items: cart.lines.map((line) => ({
        product: line.product,
        quantity: line.quantity,
        toppings: [],
      })),
    })

    if (!order) return

    if (!isSupabaseEnabled && paymentMethod !== 'cash') {
      useDemoStore.getState().simulatePayment({
        orderId: order.id,
        orderCode: order.code,
        provider: toProvider(paymentMethod),
        amount: order.total,
        reference: order.code,
        senderName: customerName.trim() || 'Cliente mostrador',
      })
    }

    setCreated(order)
    cart.clear()
    setCustomerName('')
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-4 lg:h-[calc(100dvh-3.5rem)] lg:flex-row lg:overflow-hidden">
      <section className="flex min-w-0 flex-1 flex-col gap-3">
        {!shiftOpen && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-400/40 bg-accent-500/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-accent-500/20 p-2 text-accent-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Turno no iniciado</p>
                <p className="text-[11px] text-white/50">
                  Completa el checklist de apertura para habilitar ventas en caja.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-accent-500 text-white hover:bg-accent-400"
              onClick={() => setOpenChecklist(true)}
            >
              <ClipboardCheck className="h-4 w-4" />
              Abrir turno
            </Button>
          </div>
        )}

        {shiftOpen && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            Turno abierto
            {lastOpening ? ` · ${lastOpening.user_name}` : ''} · checklist completo
          </div>
        )}

        {frontOrders.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-amber-400/20 p-2 text-amber-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-white">Pedido en frente</p>
                <p className="text-[11px] text-white/60">
                  {frontOrders
                    .map((order) => `${order.code} · ${order.delivery_address ?? 'Condominios del Ensueño 1'}`)
                    .join(' — ')}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
              No asignar domiciliario
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar producto…"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-3 text-sm text-white placeholder:text-white/40 focus:border-brand-400 focus:outline-none"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            {categories.map((key) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  category === key
                    ? 'bg-brand-500 text-ink-950'
                    : 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {CATEGORY_LABELS[key] ?? key}
              </button>
            ))}
          </div>
        </div>

        <div className="no-scrollbar grid flex-1 grid-cols-3 gap-2 overflow-y-auto pb-2 sm:grid-cols-4 xl:grid-cols-5">
          {loading && <p className="text-sm text-white/50">Cargando catálogo…</p>}
          {!loading && filtered.length === 0 && (
            <p className="col-span-full text-sm text-white/50">Sin resultados.</p>
          )}
          {filtered.map((product) => (
            <ProductTile key={product.id} product={product} onClick={() => cart.add(product)} />
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Comandas activas · {activeOrders.length}
          </p>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {activeOrders.length === 0 && (
              <p className="text-xs text-white/40">No hay comandas activas.</p>
            )}
            {activeOrders.slice(0, 8).map((order) => (
              <div
                key={order.id}
                className="w-44 shrink-0 rounded-xl border border-white/10 bg-white/5 p-2.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-brand-300">{order.code}</span>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 truncate text-[11px] text-white/60">
                  {order.items?.length ?? 0} ítems · {formatCOP(order.total)}
                </p>
                <div className="mt-1.5 flex gap-1">
                  {order.status === 'pending' && (
                    <button
                      onClick={() => void updateStatus(order.id, 'preparing')}
                      className="rounded bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/20"
                    >
                      Preparar
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() => void updateStatus(order.id, 'ready')}
                      className="rounded bg-emerald-500/20 px-2 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/30"
                    >
                      Listo
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button
                      onClick={() => void updateStatus(order.id, 'delivered')}
                      className="rounded bg-brand-500/20 px-2 py-1 text-[10px] font-semibold text-brand-300 hover:bg-brand-500/30"
                    >
                      Entregar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <aside className="flex w-full shrink-0 flex-col rounded-2xl border border-white/10 bg-white/5 lg:w-96">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Comanda actual
            </p>
            <p className="text-sm font-bold text-white">{cart.count} ítems</p>
          </div>
          {cart.lines.length > 0 && (
            <button
              onClick={cart.clear}
              className="rounded-lg p-2 text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Limpiar comanda"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
          {cart.lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-8 text-center">
              <UtensilsCrossed className="h-8 w-8 text-white/20" />
              <p className="mt-2 text-xs text-white/40">
                Toca un producto para armar la comanda.
              </p>
            </div>
          ) : (
            cart.lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white">{line.product.name}</p>
                  <p className="text-[10px] text-white/40">{formatCOP(line.product.price)}</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-white/10 px-0.5">
                  <button
                    className="p-1.5 text-white/60 hover:text-white"
                    onClick={() => cart.decrement(line.key)}
                    aria-label="Disminuir"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center text-xs font-bold text-white">
                    {line.quantity}
                  </span>
                  <button
                    className="p-1.5 text-white/60 hover:text-white"
                    onClick={() => cart.add(line.product)}
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <span className="w-16 text-right text-xs font-bold text-brand-300">
                  {formatCOP(line.product.price * line.quantity)}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2.5 border-t border-white/10 p-3">
          <Input
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            placeholder="Nombre del cliente (opcional)"
            className="h-9 border-white/10 bg-white/5 text-white placeholder:text-white/40"
          />

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setChannel('dine_in')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${
                channel === 'dine_in'
                  ? 'bg-brand-500 text-ink-950'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <UtensilsCrossed className="h-3.5 w-3.5" />
              Mesa
            </button>
            <button
              onClick={() => setChannel('pickup')}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold ${
                channel === 'pickup'
                  ? 'bg-brand-500 text-ink-950'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Para llevar
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {METHODS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setPaymentMethod(value)}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold ${
                  paymentMethod === value
                    ? 'bg-white text-ink-950'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-white/10 pt-2">
            <span className="text-xs text-white/50">Total</span>
            <span className="text-2xl font-extrabold text-brand-300">
              {formatCOP(cart.subtotal)}
            </span>
          </div>

          {error && <p className="text-[11px] text-accent-300">{error}</p>}

          <Button
            size="lg"
            className="w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
            disabled={cart.lines.length === 0 || !shiftOpen}
            loading={submitting}
            onClick={() => void checkout()}
          >
            Cobrar y enviar a cocina
          </Button>
          <p className="text-center text-[10px] text-white/30">
            {shiftOpen
              ? `Cajero: ${fullName} · turno activo`
              : 'Abre el turno con el checklist para cobrar'}
          </p>
        </div>
      </aside>

      <Modal
        open={Boolean(created)}
        onClose={() => setCreated(null)}
        title="Comanda creada"
        description="Enviada al KDS en tiempo real"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreated(null)}>
              Cerrar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Imprimir
            </Button>
          </div>
        }
      >
        {created && (
          <div className="space-y-3 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="font-display text-4xl text-ink-900">{created.code}</p>
            <p className="text-sm text-ink-500">
              {created.items?.length ?? 0} ítems · {formatCOP(created.total)}
            </p>
            <p className="text-xs text-ink-400">
              Pago: {created.payment_method} ·{' '}
              {created.payment_status === 'confirmed' ? 'confirmado' : 'pendiente de validación'}
            </p>
            {created.payment_status === 'pending' && (
              <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-700">
                Verifica la transferencia en <strong>Admin → Pagos Bre-B</strong>.
              </p>
            )}
          </div>
        )}
      </Modal>

      <OpeningChecklistModal
        open={openChecklist}
        onClose={() => setOpenChecklist(false)}
      />
    </div>
  )
}
