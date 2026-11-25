import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ChefHat,
  Clock3,
  Copy,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Store,
  Truck,
} from 'lucide-react'
import { useOrder } from '@/modules/ordering/hooks/useOrders'
import { useBreBVerifications } from '@/modules/bre-b-verification/hooks/useBreBVerifications'
import { ChatPanel } from '@/modules/delivery/components/ChatPanel'
import { isSupabaseEnabled } from '@/shared/services/supabase'
import {
  CHANNEL_META,
  PAYMENT_META,
  StatusBadge,
} from '@/shared/ui/OrderMeta'
import { formatCOP } from '@/shared/lib/format'
import { channelLabel } from '@/shared/lib/schedule'
import type { PaymentProvider } from '@/shared/types'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card'
import { EmptyState, Skeleton } from '@/shared/ui/Feedback'
import { ProductImage } from '@/shared/ui/Brand'

const STEPS = [
  { key: 'pending', label: 'Pendiente', icon: ReceiptText },
  { key: 'preparing', label: 'En preparación', icon: ChefHat },
  { key: 'ready', label: 'Listo', icon: PackageCheck },
  { key: 'delivered', label: 'Entregado', icon: CheckCircle2 },
] as const

function providerFor(method: string): PaymentProvider {
  if (method === 'nequi' || method === 'daviplata' || method === 'bancolombia') return method
  return 'bre_b'
}

export function TrackingPage() {
  const { orderId } = useParams()
  const { order, loading, error } = useOrder(orderId)
  const { notifications, pending, simulate } = useBreBVerifications(order?.id)
  const [, setTick] = useState(0)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const activeIndex = useMemo(() => {
    if (!order) return 0
    const index = STEPS.findIndex((step) => step.key === order.status)
    return index < 0 ? 0 : index
  }, [order])

  const hasPendingPayment = pending.some((notification) => notification.status === 'pending')

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!order) {
    return (
      <EmptyState
        title="No encontramos este pedido"
        description={error ?? 'Verifica el enlace o vuelve a crear un pedido.'}
        action={
          <Button onClick={() => window.history.back()}>Volver</Button>
        }
      />
    )
  }

  const isExternal = order.channel === 'rappi' || order.channel === 'didi'
  const isOwnDelivery = order.channel === 'own_delivery'
  const isFront = order.channel === 'front_delivery'

  return (
    <div className="space-y-4">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-400 hover:text-ink-700"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Volver al menú
      </Link>

      <section className="bg-wood overflow-hidden rounded-3xl p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-300">
              Pedido confirmado
            </p>
            <h1 className="mt-1 font-display text-3xl text-white">{order.code}</h1>
            <p className="mt-1 text-xs text-white/60">
              {new Date(order.created_at).toLocaleString('es-CO', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}{' '}

            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-1">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const done = order.status !== 'cancelled' && index <= activeIndex
            return (
              <div key={step.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border ${
                    done
                      ? 'border-brand-400 bg-brand-500 text-ink-950'
                      : 'border-white/20 bg-white/5 text-white/40'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span
                  className={`text-center text-[9px] font-semibold uppercase tracking-wide ${
                    done ? 'text-brand-200' : 'text-white/40'
                  }`}
                >
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Entrega</CardTitle>
              <Badge
                variant={
                  isExternal ? 'info' : isFront ? 'warning' : isOwnDelivery ? 'brand' : 'outline'
                }
              >
                {CHANNEL_META[order.channel].label}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {isOwnDelivery && (
                <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                  Domiciliario propio ENTUSADOS asignado
                  {order.delivery_zone_name ? ` · ${order.delivery_zone_name}` : ''}
                </p>
              )}
              {isFront && (
                <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-800">
                  <Store className="mt-0.5 h-4 w-4 shrink-0" />
                  Entrega en frente · el equipo de ENTUSADOS lo lleva directamente.
                  {order.delivery_zone_name ? ` ${order.delivery_zone_name}.` : ''}
                </p>
              )}
              {isExternal && (
                <p className="flex items-start gap-2 rounded-xl bg-sky-50 p-2.5 text-xs text-sky-800">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0" />
                  El pedido fue enrutado a <strong>{channelLabel(routeChannel(order.channel))}</strong>{' '}
                  por cobertura. Un repartidor externo lo tomará; el chat sigue disponible con la
                  tienda.
                </p>
              )}
              {order.channel === 'pickup' && (
                <p className="flex items-start gap-2 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-600">
                  <Store className="mt-0.5 h-4 w-4 shrink-0" />
                  Recoges en tienda. Te avisamos por chat cuando esté listo.
                </p>
              )}
              {order.channel === 'dine_in' && (
                <p className="flex items-start gap-2 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-600">
                  <Store className="mt-0.5 h-4 w-4 shrink-0" />
                  Consumo en mesa. El equipo lo lleva cuando esté listo.
                </p>
              )}
              {order.channel === 'local' && (
                <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-800">
                  <Store className="mt-0.5 h-4 w-4 shrink-0" />
                  Estoy Entusado · el equipo te preguntará si es mesa o para llevar al entregar.
                </p>
              )}
              {order.delivery_address && (
                <p className="flex items-start gap-2 text-xs text-ink-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                  {order.delivery_address}
                </p>
              )}
              {order.notes && (
                <p className="rounded-xl bg-ink-50 p-2.5 text-xs text-ink-500">
                  Nota: {order.notes}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pago</CardTitle>
              <Badge
                variant={
                  order.payment_status === 'confirmed'
                    ? 'success'
                    : order.payment_status === 'rejected'
                      ? 'danger'
                      : 'warning'
                }
              >
                {order.payment_status === 'confirmed'
                  ? 'Confirmado'
                  : order.payment_status === 'rejected'
                    ? 'Rechazado'
                    : 'En verificación'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">{PAYMENT_META[order.payment_method]}</span>
                <span className="font-bold">{formatCOP(order.total)}</span>
              </div>

              {order.payment_method !== 'cash' && order.payment_status === 'pending' && (
                <div className="rounded-xl border border-dashed border-brand-300 bg-brand-50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-brand-800">
                    <ShieldCheck className="h-4 w-4" />
                    Transferencia Bre-B / banco
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-600">
                    Envía {formatCOP(order.total)} a Nequi/Bre-B <strong>3144358430</strong> y usa
                    como referencia:
                  </p>
                  <button
                    onClick={() => {
                      void navigator.clipboard?.writeText(order.code)
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1500)
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-ink-900 shadow-sm"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? 'Copiado' : order.code}
                  </button>

                  {!hasPendingPayment && !isSupabaseEnabled && (
                    <button
                      onClick={() =>
                        void simulate({
                          orderId: order.id,
                          orderCode: order.code,
                          provider: providerFor(order.payment_method),
                          amount: order.total,
                          reference: order.code,
                          senderName: order.customer_name,
                        })
                      }
                      className="mt-2 block text-[11px] font-semibold text-brand-700 underline underline-offset-2"
                    >
                      Ya hice la transferencia (simular notificación)
                    </button>
                  )}
                  {hasPendingPayment && (
                    <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-amber-700">
                      <Clock3 className="h-3 w-3" />
                      Notificación recibida · validando
                    </p>
                  )}
                  {notifications.length > 0 && (
                    <p className="mt-1 text-[10px] text-ink-400">
                      {notifications[0].provider.replace('_', '-')} ·{' '}
                      {notifications[0].status}
                    </p>
                  )}
                </div>
              )}

              {order.payment_method === 'cash' && (
                <p className="flex items-start gap-2 rounded-xl bg-ink-50 p-2.5 text-xs text-ink-500">
                  <Smartphone className="mt-0.5 h-4 w-4 shrink-0" />
                  Paga en efectivo{' '}
                  {order.channel === 'pickup'
                    ? 'al recoger'
                    : order.channel === 'dine_in' || order.channel === 'local'
                      ? 'en caja'
                      : 'al recibir'}
                  . El cajero confirma el pago.
                </p>
              )}

              <div className="space-y-1 border-t border-dashed border-ink-200 pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-400">Subtotal</span>
                  <span>{formatCOP(order.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-400">Domicilio</span>
                  <span>{order.delivery_fee > 0 ? formatCOP(order.delivery_fee) : '—'}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>{formatCOP(order.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Productos</CardTitle>
              <span className="text-xs text-ink-400">{order.items?.length ?? 0} líneas</span>
            </CardHeader>
            <CardContent className="space-y-2">
              {(order.items ?? []).map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <ProductImage
                    product={{
                      image_url: null,
                      category: 'elotes',
                      name: item.product_name,
                    }}
                    className="h-10 w-10 shrink-0 rounded-lg"
                    emojiClassName="text-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink-800">
                      {item.quantity}× {item.product_name}
                    </p>
                    {item.toppings.length > 0 && (
                      <p className="truncate text-[10px] text-ink-400">
                        {item.toppings.map((t) => t.name).join(', ')}
                      </p>
                    )}
                    {item.notes && (
                      <p className="truncate text-[10px] italic text-ink-400">{item.notes}</p>
                    )}
                  </div>
                  <span className="text-xs font-bold">{formatCOP(item.line_total)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <ChatPanel orderId={order.id} />
          <div className="rounded-2xl border border-ink-100 bg-white p-4 text-xs text-ink-500">
            <p className="font-bold text-ink-800">Canal de reparto</p>
            <p className="mt-1">
              {order.channel_source === 'front'
                ? `Enfrente · entrega directa del equipo${order.delivery_zone_name ? ` en ${order.delivery_zone_name}` : ''}.`
                : order.channel_source === 'coverage'
                  ? `Asignado por cobertura${order.delivery_zone_name ? ` · ${order.delivery_zone_name}` : ''}.`
                  : order.channel_source === 'fallback'
                    ? 'Fuera de cobertura propia: reasignado a agregador externo.'
                    : 'Punto físico o asignación manual del equipo.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function routeChannel(channel: string): 'own' | 'rappi' | 'didi' {
  if (channel === 'own_delivery') return 'own'
  if (channel === 'didi') return 'didi'
  return 'rappi'
}
