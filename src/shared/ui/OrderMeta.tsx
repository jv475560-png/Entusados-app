import type { OrderChannel, OrderStatus, PaymentMethod, PaymentStatus } from '@/shared/types'
import { Badge } from './Badge'

export const STATUS_META: Record<
  OrderStatus,
  { label: string; variant: 'neutral' | 'warning' | 'info' | 'success' | 'danger' }
> = {
  pending: { label: 'Pendiente', variant: 'warning' },
  preparing: { label: 'En preparación', variant: 'info' },
  ready: { label: 'Listo', variant: 'success' },
  delivered: { label: 'Entregado', variant: 'neutral' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
}

export const CHANNEL_META: Record<OrderChannel, { label: string; short: string }> = {
  local: { label: 'Estoy Entusado', short: 'Entusado' },
  dine_in: { label: 'Mesa / local', short: 'Mesa' },
  pickup: { label: 'Recoge en tienda', short: 'Pickup' },
  own_delivery: { label: 'Domiciliario ENTUSADOS', short: 'Propio' },
  front_delivery: { label: 'Enfrente · entrega directa', short: 'Enfrente' },
  rappi: { label: 'Rappi', short: 'Rappi' },
  didi: { label: 'DiDi Food', short: 'DiDi' },
}

export const PAYMENT_META: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  bre_b: 'Bre-B',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
  card: 'Tarjeta',
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status]
  return <Badge variant={meta.variant}>{meta.label}</Badge>
}

export function ChannelBadge({ channel }: { channel: OrderChannel }) {
  const meta = CHANNEL_META[channel]
  return (
    <Badge variant={channel === 'own_delivery' ? 'brand' : channel === 'pickup' ? 'outline' : 'info'}>
      {meta.short}
    </Badge>
  )
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  if (status === 'confirmed') return <Badge variant="success">Pagado</Badge>
  if (status === 'rejected') return <Badge variant="danger">Rechazado</Badge>
  return <Badge variant="warning">Pago pendiente</Badge>
}
