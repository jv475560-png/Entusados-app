import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  ChefHat,
  MapPin,
  Clock3,
  DollarSign,
  Receipt,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useOrders } from '@/modules/ordering/hooks/useOrders'
import { useInventory } from '@/modules/inventory/hooks/useInventory'
import { useDeliveryRouting } from '@/modules/delivery/hooks/useDeliveryRouting'
import { useBreBVerifications } from '@/modules/bre-b-verification/hooks/useBreBVerifications'
import { formatCOP, formatNumber } from '@/shared/lib/format'
import { channelLabel, getBogotaTime } from '@/shared/lib/schedule'
import { CHANNEL_META, PaymentStatusBadge, StatusBadge } from '@/shared/ui/OrderMeta'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/Card'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

function bogotaDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function DashboardPage() {
  const { orders, activeOrders } = useOrders()
  const { ingredients, lowStock } = useInventory()
  const { zones, defaultChannel } = useDeliveryRouting()
  const activeZones = zones.filter((zone) => zone.is_active)
  const { pending: pendingPayments } = useBreBVerifications()

  const todayKey = bogotaDateKey(new Date())
  const todayOrders = orders.filter(
    (order) => bogotaDateKey(new Date(order.created_at)) === todayKey,
  )
  const confirmedToday = todayOrders.filter((order) => order.payment_status === 'confirmed')
  const salesToday = confirmedToday.reduce((sum, order) => sum + order.total, 0)
  const avgTicket = confirmedToday.length > 0 ? salesToday / confirmedToday.length : 0
  const digitalToday = confirmedToday
    .filter((order) => order.payment_method !== 'cash')
    .reduce((sum, order) => sum + order.total, 0)

  const inventoryValue = ingredients.reduce(
    (sum, ingredient) => sum + ingredient.stock_qty * ingredient.cost_per_unit,
    0,
  )

  const clock = getBogotaTime()
  const frontOrders = activeOrders.filter(
    (order) => order.channel === 'front_delivery',
  )

  return (
    <div>
      <PageHeader
        eyebrow="Operación ENTUSADOS"
        title="RESUMEN DEL DÍA"
        description="Ventas, comandas activas, stock crítico y zonas de cobertura del domiciliario propio."
        actions={
          <>
            <Badge variant="outline">
              <Clock3 className="h-3 w-3" />
              {clock.label} Bogotá
            </Badge>
            <Link to="/admin/cobertura">
              <Button variant="outline" size="sm">
                <MapPin className="h-4 w-4" />
                Cobertura
              </Button>
            </Link>
            <Link to="/admin/pos">
              <Button size="sm">
                <Receipt className="h-4 w-4" />
                Abrir POS
              </Button>
            </Link>
          </>
        }
      />

      {frontOrders.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-amber-100 p-2 text-amber-700">
              <MapPin className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-900">
                Pedido en frente · Condominios del Ensueño 1
              </p>
              <p className="text-[11px] text-amber-700">
                {frontOrders
                  .map((order) => `${order.code} — ${order.delivery_address ?? ''}`)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <Link to="/admin/pos">
            <Button size="sm" variant="secondary">
              Ver en POS
            </Button>
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ventas confirmadas hoy"
          value={formatCOP(salesToday)}
          hint={`${confirmedToday.length} pedidos pagados`}
          icon={DollarSign}
          tone="green"
        />
        <StatCard
          label="Pedidos activos"
          value={activeOrders.length}
          hint={`${todayOrders.length} pedidos hoy en total`}
          icon={ChefHat}
          tone="brand"
        />
        <StatCard
          label="Ticket promedio"
          value={formatCOP(avgTicket)}
          hint={`Digital hoy: ${formatCOP(digitalToday)}`}
          icon={TrendingUp}
          tone="blue"
        />
        <StatCard
          label="Stock crítico"
          value={lowStock.length}
          hint={`${ingredients.length} insumos · valor ${formatCOP(inventoryValue)}`}
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? 'red' : 'green'}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <SectionCard
            title="Pedidos recientes"
            action={
              <Link
                to="/admin/kds"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900"
              >
                Ver cocina
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                    <th className="px-1 pb-2 font-semibold">Pedido</th>
                    <th className="px-1 pb-2 font-semibold">Canal</th>
                    <th className="px-1 pb-2 font-semibold">Estado</th>
                    <th className="px-1 pb-2 font-semibold">Pago</th>
                    <th className="px-1 pb-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td className="px-1 py-2.5">
                        <p className="text-xs font-bold text-ink-900">{order.code}</p>
                        <p className="text-[11px] text-ink-400">{order.customer_name}</p>
                      </td>
                      <td className="px-1 py-2.5 text-xs text-ink-600">
                        {CHANNEL_META[order.channel].short}
                      </td>
                      <td className="px-1 py-2.5">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-1 py-2.5">
                        <PaymentStatusBadge status={order.payment_status} />
                      </td>
                      <td className="px-1 py-2.5 text-right text-xs font-bold">
                        {formatCOP(order.total)}
                      </td>
                    </tr>
                  ))}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-1 py-8 text-center text-xs text-ink-400">
                        Aún no hay pedidos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard
            title="Stock crítico (BOM)"
            action={
              <Link
                to="/admin/inventario"
                className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900"
              >
                Inventario
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {lowStock.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 px-3 py-4 text-center text-xs font-semibold text-emerald-700">
                Todo el inventario está por encima del mínimo. 🌽
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {lowStock.slice(0, 6).map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className="flex items-center justify-between rounded-xl border border-accent-100 bg-accent-50/60 px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-bold text-ink-900">{ingredient.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {formatNumber(ingredient.stock_qty)} {ingredient.unit} · mín.{" "}
                        {formatNumber(ingredient.min_stock)}
                      </p>
                    </div>
                    <Badge variant="danger">Reponer</Badge>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Cobertura de domicilio</CardTitle>
              <Badge variant={activeZones.length > 0 ? 'success' : 'danger'}>
                {activeZones.length} zonas
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-display text-2xl text-ink-900">
                DOMICILIARIO PROPIO
              </p>
              <p className="text-xs text-ink-500">
                Solo en los barrios autorizados. Fuera de cobertura se asigna{' '}
                {channelLabel(defaultChannel)}.
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {activeZones.map((zone) => (
                  <span
                    key={zone.id}
                    className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-500"
                  >
                    {zone.name}
                  </span>
                ))}
                {activeZones.length === 0 && (
                  <span className="text-[11px] text-accent-500">
                    Todas las zonas están pausadas.
                  </span>
                )}
              </div>
              <Link
                to="/admin/cobertura"
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-400"
              >
                Editar cobertura
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>

          <Link to="/admin/pagos" className="block">
            <div className="rounded-2xl border border-brand-200 bg-brand-50 p-4 transition hover:border-brand-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-brand-800">
                  <Wallet className="h-5 w-5" />
                  <p className="text-sm font-bold">Pagos Bre-B</p>
                </div>
                <Badge variant={pendingPayments.length > 0 ? 'danger' : 'success'}>
                  {pendingPayments.length} pendientes
                </Badge>
              </div>
              <p className="mt-1 text-xs text-brand-700/80">
                Validación automática de transferencias Nequi, Daviplata y bancos.
              </p>
            </div>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/admin/proveedores"
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition hover:border-brand-300"
            >
              <Boxes className="h-5 w-5 text-ink-400" />
              <p className="mt-2 text-xs font-bold text-ink-900">Proveedores</p>
              <p className="text-[11px] text-ink-400">Órdenes anticipadas</p>
            </Link>
            <Link
              to="/admin/contabilidad"
              className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card transition hover:border-brand-300"
            >
              <Receipt className="h-5 w-5 text-ink-400" />
              <p className="mt-2 text-xs font-bold text-ink-900">Cierre de caja</p>
              <p className="text-[11px] text-ink-400">Arqueo y utilidad</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
