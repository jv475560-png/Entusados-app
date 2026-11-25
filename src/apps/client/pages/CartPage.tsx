import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bike,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { cartSubtotal, useCartStore } from '@/modules/ordering/store/cartStore'
import { useCreateOrder } from '@/modules/ordering/hooks/useCreateOrder'
import { useDeliveryRouting } from '@/modules/delivery/hooks/useDeliveryRouting'
import { useClientLocation } from '@/shared/contexts/ClientLocationContext'
import { DeliveryRouteBanner } from '@/modules/delivery/components/DeliveryRouteBanner'
import { useAuthStore } from '@/shared/services/auth'
import { isSupabaseEnabled } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'
import { formatCOP } from '@/shared/lib/format'
import { channelLabel } from '@/shared/lib/schedule'
import { ProductImage } from '@/shared/ui/Brand'
import { Button } from '@/shared/ui/Button'
import { EmptyState } from '@/shared/ui/Feedback'

const CHECKOUT_KEY = 'entusados-checkout-v1'

export function CartPage() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const fulfillment = useCartStore((state) => state.fulfillment)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clear = useCartStore((state) => state.clear)
  const { createOrder, submitting, error } = useCreateOrder()
  const fullName = useAuthStore((state) => state.fullName)
  const phone = useAuthStore((state) => state.phone)
  const geo = useClientLocation()
  const { route, deliveryFee } = useDeliveryRouting({
    lat: geo.position?.lat ?? null,
    lng: geo.position?.lng ?? null,
    neighborhood: geo.neighborhood || null,
  })

  const subtotal = cartSubtotal(items)
  const fee = fulfillment === 'delivery' ? deliveryFee : 0
  const total = subtotal + fee

  const confirmLocalOrder = async () => {
    let saved: { name?: string; phone?: string } | null = null
    try {
      const raw = localStorage.getItem(CHECKOUT_KEY)
      saved = raw ? (JSON.parse(raw) as { name?: string; phone?: string }) : null
    } catch {
      saved = null
    }

    const customerName =
      saved?.name ||
      (fullName && fullName !== 'Cliente ENTUSADOS' ? fullName : 'Cliente ENTUSADOS')
    const customerPhone = saved?.phone || phone || ''

    const order = await createOrder({
      customerName,
      customerPhone,
      channel: 'local',
      paymentMethod: 'bre_b',
      items: items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        toppings: item.toppings,
        notes: item.notes || undefined,
      })),
    })

    if (!order) return

    if (!isSupabaseEnabled) {
      useDemoStore.getState().simulatePayment({
        orderId: order.id,
        orderCode: order.code,
        provider: 'bre_b',
        amount: order.total,
        reference: order.code,
        senderName: customerName,
      })
    }

    clear()
    navigate(`/success/${order.id}`)
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="h-10 w-10" />}
        title="Tu carrito está vacío"
        description="Agrega un elote, una espiropapa o una hamburguesa para empezar."
        action={
          <Button onClick={() => navigate('/')}>
            Ver el menú
            <ArrowRight className="h-4 w-4" />
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">TU PEDIDO</h1>
          <p className="text-xs text-ink-400">
            {items.length} productos · ajusta cantidades antes de pagar
          </p>
        </div>

        {fulfillment === 'delivery' && <DeliveryRouteBanner />}

        {items.map((item) => (
          <article
            key={item.key}
            className="flex gap-3 rounded-2xl border border-ink-100 bg-white p-3"
          >
            <ProductImage
              product={item.product}
              className="h-20 w-20 shrink-0 rounded-xl"
              emojiClassName="text-3xl"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-ink-900">{item.product.name}</h3>
                  {item.toppings.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-ink-400">
                      + {item.toppings.map((t) => t.name).join(', ')}
                    </p>
                  )}
                  {item.notes && (
                    <p className="mt-0.5 text-[11px] italic text-ink-400">“{item.notes}”</p>
                  )}
                </div>
                <button
                  onClick={() => removeItem(item.key)}
                  className="rounded-lg p-1 text-ink-300 hover:bg-accent-50 hover:text-accent-600"
                  aria-label={`Quitar ${item.product.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-lg border border-ink-200 px-0.5">
                  <button
                    className="p-1.5 text-ink-500 hover:text-ink-900"
                    onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    aria-label="Disminuir"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                  <button
                    className="p-1.5 text-ink-500 hover:text-ink-900"
                    onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    aria-label="Aumentar"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="text-sm font-bold text-ink-900">{formatCOP(item.lineTotal)}</span>
              </div>
            </div>
          </article>
        ))}

      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Resumen</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="font-semibold">{formatCOP(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">
                {fulfillment === 'delivery'
                  ? `Domicilio (${channelLabel(route.channel)})`
                  : 'Estoy Entusado · sin domicilio'}
              </dt>
              <dd className="font-semibold">{fee > 0 ? formatCOP(fee) : 'Gratis'}</dd>
            </div>
            <div className="flex justify-between border-t border-dashed border-ink-200 pt-2 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-extrabold">{formatCOP(total)}</dd>
            </div>
          </dl>

          {fulfillment === 'delivery' && route.status === 'outside' && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-[11px] text-amber-700">
              <Bike className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Fuera de cobertura del domiciliario propio: tu pedido se asigna a{' '}
                <strong>{channelLabel(route.channel)}</strong>.
              </p>
            </div>
          )}

          {fulfillment === 'local' ? (
            <Button
              className="mt-4 w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
              size="lg"
              loading={submitting}
              onClick={() => void confirmLocalOrder()}
            >
              Confirmar pedido · {formatCOP(total)}
            </Button>
          ) : (
            <Button
              className="mt-4 w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
              size="lg"
              onClick={() => navigate('/checkout')}
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {fulfillment === 'local' && (
            <p className="mt-2 text-center text-[10px] text-ink-400">
              Estoy Entusado · no necesitas dirección.
            </p>
          )}

          {error && (
            <p className="mt-2 rounded-lg bg-accent-50 px-2 py-1.5 text-[11px] text-accent-700">
              {error}
            </p>
          )}

          <Link
            to="/"
            className="mt-2 block text-center text-xs font-semibold text-ink-400 hover:text-ink-700"
          >
            Seguir agregando
          </Link>
        </div>
      </aside>
    </div>
  )
}
