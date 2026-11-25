import { useEffect, useState } from 'react'
import { ChefHat, CheckCheck, Clock3, Flame, PackageCheck, Timer } from 'lucide-react'
import { useOrders } from '@/modules/ordering/hooks/useOrders'
import { formatCOP, minutesSince } from '@/shared/lib/format'
import type { Order, OrderStatus } from '@/shared/types'
import { Button } from '@/shared/ui/Button'
import { ChannelBadge, PaymentStatusBadge } from '@/shared/ui/OrderMeta'
import { cn } from '@/shared/lib/format'

function timerTone(minutes: number): { tone: 'green' | 'amber' | 'red'; classes: string; label: string } {
  if (minutes < 10) {
    return { tone: 'green', classes: 'border-emerald-400/40 bg-emerald-400/10', label: 'En tiempo' }
  }
  if (minutes < 20) {
    return { tone: 'amber', classes: 'border-amber-400/40 bg-amber-400/10', label: 'Atención' }
  }
  return { tone: 'red', classes: 'border-accent-400/50 bg-accent-500/10', label: 'Demorado' }
}

function OrderCard({
  order,
  now,
  onAdvance,
  onCancel,
}: {
  order: Order
  now: number
  onAdvance: () => void
  onCancel: () => void
}) {
  const minutes = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000))
  const tone = timerTone(minutes)
  const nextLabel =
    order.status === 'pending' ? 'Aceptar' : order.status === 'preparing' ? 'Marcar listo' : 'Entregar'
  const Icon = order.status === 'pending' ? ChefHat : order.status === 'preparing' ? Flame : PackageCheck

  return (
    <article
      className={cn(
        'rounded-2xl border bg-ink-900 p-3 text-white shadow-lg transition',
        tone.classes,
        minutes >= 20 && order.status !== 'ready' && 'animate-pulse-ring',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold tracking-wide text-brand-300">{order.code}</p>
          <p className="text-[11px] text-white/50">
            {order.customer_name} · {minutes} min
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
            tone.tone === 'green'
              ? 'bg-emerald-400/20 text-emerald-300'
              : tone.tone === 'amber'
                ? 'bg-amber-400/20 text-amber-300'
                : 'bg-accent-500/25 text-accent-200',
          )}
        >
          <Clock3 className="h-3 w-3" />
          {tone.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <ChannelBadge channel={order.channel} />
        <PaymentStatusBadge status={order.payment_status} />
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/60">
          {formatCOP(order.total)}
        </span>
      </div>

      {order.channel === 'front_delivery' && (
        <p className="mt-2 rounded-lg border border-amber-300/40 bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-200">
          ENFRENTE · {order.delivery_zone_name ?? order.delivery_address ?? 'Condominios del Ensueño 1'}
        </p>
      )}

      <ul className="mt-2.5 space-y-1 border-t border-white/10 pt-2">
        {(order.items ?? []).map((item) => (
          <li key={item.id} className="text-xs text-white/85">
            <span className="font-bold text-brand-200">{item.quantity}×</span> {item.product_name}
            {item.toppings.length > 0 && (
              <span className="block pl-4 text-[10px] text-white/40">
                + {item.toppings.map((t) => t.name).join(', ')}
              </span>
            )}
            {item.notes && (
              <span className="block pl-4 text-[10px] italic text-amber-300/80">“{item.notes}”</span>
            )}
          </li>
        ))}
        {(order.items ?? []).length === 0 && (
          <li className="text-[11px] text-white/40">Sin ítems cargados</li>
        )}
      </ul>

      {order.notes && (
        <p className="mt-2 rounded-lg bg-amber-400/10 px-2 py-1 text-[10px] text-amber-200">
          Nota general: {order.notes}
        </p>
      )}

      <div className="mt-2.5 flex gap-1.5">
        <Button size="sm" className="flex-1" onClick={onAdvance}>
          <Icon className="h-3.5 w-3.5" />
          {nextLabel}
        </Button>
        {order.status === 'pending' && (
          <Button size="sm" variant="danger" onClick={onCancel} aria-label="Cancelar pedido">
            Cancelar
          </Button>
        )}
      </div>
    </article>
  )
}

function Column({
  title,
  icon: Icon,
  orders,
  now,
  accent,
  onAdvance,
  onCancel,
  emptyText,
}: {
  title: string
  icon: typeof ChefHat
  orders: Order[]
  now: number
  accent: string
  onAdvance: (order: Order) => void
  onCancel: (order: Order) => void
  emptyText: string
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-white/5">
      <header className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn('rounded-lg p-1.5', accent)}>
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-white/80">{title}</h2>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">
          {orders.length}
        </span>
      </header>
      <div className="space-y-2 overflow-y-auto p-2">
        {orders.length === 0 && (
          <p className="py-8 text-center text-xs text-white/30">{emptyText}</p>
        )}
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            now={now}
            onAdvance={() => onAdvance(order)}
            onCancel={() => onCancel(order)}
          />
        ))}
      </div>
    </section>
  )
}

export function KdsPage() {
  const { activeOrders, updateStatus, loading } = useOrders()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const pending = activeOrders
    .filter((order) => order.status === 'pending')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const preparing = activeOrders
    .filter((order) => order.status === 'preparing')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
  const ready = activeOrders
    .filter((order) => order.status === 'ready')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const advance = (order: Order, status: OrderStatus) => {
    void updateStatus(order.id, status)
  }

  const nextStatus = (status: OrderStatus): OrderStatus => {
    if (status === 'pending') return 'preparing'
    if (status === 'preparing') return 'ready'
    return 'delivered'
  }

  const oldest = [...activeOrders].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )[0]
  const avgMinutes =
    activeOrders.length > 0
      ? Math.round(
          activeOrders.reduce((sum, order) => sum + minutesSince(order.created_at), 0) /
            activeOrders.length,
        )
      : 0

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-7xl flex-col gap-3 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/40">
            Kitchen Display System
          </p>
          <h1 className="font-display text-2xl text-brand-400">COCINA EN VIVO</h1>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-white/60">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <Timer className="h-3.5 w-3.5 text-brand-300" />
            Promedio {avgMinutes} min
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <CheckCheck className="h-3.5 w-3.5 text-emerald-400" />
            {activeOrders.length} activos
          </span>
          {oldest && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <Clock3 className="h-3.5 w-3.5 text-amber-300" />
              Más antiguo {minutesSince(oldest.created_at)} min
            </span>
          )}
        </div>
      </div>

      <p className="text-[11px] text-white/35">
        Semáforo: verde &lt; 10 min · amarillo 10–20 min · rojo &gt; 20 min
      </p>

      {loading ? (
        <p className="text-sm text-white/50">Cargando comandas…</p>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-3">
          <Column
            title="Pendientes"
            icon={ChefHat}
            orders={pending}
            now={now}
            accent="bg-amber-400/15 text-amber-300"
            onAdvance={(order) => advance(order, nextStatus(order.status))}
            onCancel={(order) => advance(order, 'cancelled')}
            emptyText="Sin comandas nuevas"
          />
          <Column
            title="En preparación"
            icon={Flame}
            orders={preparing}
            now={now}
            accent="bg-sky-400/15 text-sky-300"
            onAdvance={(order) => advance(order, nextStatus(order.status))}
            onCancel={(order) => advance(order, 'cancelled')}
            emptyText="Nada en el fuego"
          />
          <Column
            title="Listos"
            icon={PackageCheck}
            orders={ready}
            now={now}
            accent="bg-emerald-400/15 text-emerald-300"
            onAdvance={(order) => advance(order, nextStatus(order.status))}
            onCancel={(order) => advance(order, 'cancelled')}
            emptyText="Sin pedidos por entregar"
          />
        </div>
      )}
    </div>
  )
}
