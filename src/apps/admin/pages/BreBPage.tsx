import { useState } from 'react'
import { Check, ShieldCheck, Smartphone, Wallet, X } from 'lucide-react'
import { useBreBVerifications } from '@/modules/bre-b-verification/hooks/useBreBVerifications'
import { useOrders } from '@/modules/ordering/hooks/useOrders'
import { BreBSimulator } from '@/modules/bre-b-verification/components/BreBSimulator'
import { PaymentConfirmedModal } from '@/modules/bre-b-verification/components/PaymentConfirmedModal'
import type { PaymentNotification } from '@/shared/types'
import { formatCOP, formatDateTime } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

const PROVIDER_LABEL: Record<string, string> = {
  bre_b: 'Bre-B',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
}

export function BreBPage() {
  const { notifications, pending, confirm } = useBreBVerifications()
  const { orders } = useOrders()
  const [confirmedNotif, setConfirmedNotif] = useState<PaymentNotification | null>(null)

  const confirmed = notifications.filter((notification) => notification.status === 'confirmed')
  const confirmedAmount = confirmed.reduce((sum, notification) => sum + notification.amount, 0)

  const handleConfirm = async (notification: PaymentNotification) => {
    setConfirmedNotif(notification)
    await confirm(notification.id, true)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Bre-B / pagos bancarios"
        title="VALIDACIÓN DE PAGOS"
        description="Listener de transferencias en tiempo real. Sin datáfonos adicionales: confirma Nequi, Daviplata, Bancolombia y Bre-B."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Notificaciones pendientes"
          value={pending.length}
          icon={Wallet}
          tone={pending.length > 0 ? 'red' : 'green'}
        />
        <StatCard
          label="Confirmadas"
          value={confirmed.length}
          hint={`Total ${formatCOP(confirmedAmount)}`}
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Listener"
          value="Activo"
          hint="Supabase Realtime / demo local"
          icon={Smartphone}
          tone="blue"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard title="Simulador de notificación" className="xl:col-span-2">
          <BreBSimulator orders={orders} />
        </SectionCard>

        <SectionCard title="Cómo funciona">
          <ol className="space-y-2 text-xs text-ink-500">
            <li>
              <strong className="text-ink-800">1.</strong> El banco/Bre-B envía un webhook a la
              Edge Function.
            </li>
            <li>
              <strong className="text-ink-800">2.</strong> Se inserta en{' '}
              <code>payment_notifications</code> y Realtime lo empuja al panel.
            </li>
            <li>
              <strong className="text-ink-800">3.</strong> El cajero valida monto y referencia; la
              RPC <code>fn_confirm_payment</code> marca el pedido como pagado.
            </li>
            <li>
              <strong className="text-ink-800">4.</strong> El cierre de caja suma automáticamente
              los ingresos digitales.
            </li>
          </ol>
        </SectionCard>
      </div>

      <SectionCard className="mt-4" title={`Notificaciones · ${notifications.length}`}>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wide text-ink-400">
                <th className="px-1 pb-2 font-semibold">Recibida</th>
                <th className="px-1 pb-2 font-semibold">Proveedor</th>
                <th className="px-1 pb-2 font-semibold">Pedido</th>
                <th className="px-1 pb-2 font-semibold">Remitente</th>
                <th className="px-1 pb-2 text-right font-semibold">Monto</th>
                <th className="px-1 pb-2 font-semibold">Estado</th>
                <th className="px-1 pb-2 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-1 py-2.5 text-[11px] text-ink-500">
                    {formatDateTime(notification.received_at)}
                  </td>
                  <td className="px-1 py-2.5 text-xs font-semibold">
                    {PROVIDER_LABEL[notification.provider] ?? notification.provider}
                  </td>
                  <td className="px-1 py-2.5 text-xs text-ink-600">
                    {notification.order_code ?? notification.order_id ?? '—'}
                  </td>
                  <td className="px-1 py-2.5 text-xs text-ink-500">
                    {notification.sender_name ?? '—'}
                  </td>
                  <td className="px-1 py-2.5 text-right text-xs font-bold">
                    {formatCOP(notification.amount)}
                  </td>
                  <td className="px-1 py-2.5">
                    <Badge
                      variant={
                        notification.status === 'confirmed'
                          ? 'success'
                          : notification.status === 'rejected'
                            ? 'danger'
                            : 'warning'
                      }
                    >
                      {notification.status === 'confirmed'
                        ? 'Confirmado'
                        : notification.status === 'rejected'
                          ? 'Rechazado'
                          : 'Pendiente'}
                    </Badge>
                  </td>
                  <td className="px-1 py-2.5">
                    {notification.status === 'pending' ? (
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => void handleConfirm(notification)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Confirmar
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => void confirm(notification.id, false)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <p className="text-right text-[10px] text-ink-400">
                        {notification.confirmed_at
                          ? formatDateTime(notification.confirmed_at)
                          : '—'}
                      </p>
                    )}
                  </td>
                </tr>
              ))}
              {notifications.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-ink-400">
                    Sin notificaciones. Usa el simulador para probar el flujo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <PaymentConfirmedModal
        notification={confirmedNotif}
        onClose={() => setConfirmedNotif(null)}
      />
    </div>
  )
}
