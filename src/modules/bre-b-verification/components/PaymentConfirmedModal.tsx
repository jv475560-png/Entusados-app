import { Check, Clock3, ShieldCheck } from 'lucide-react'
import type { PaymentNotification } from '@/shared/types'
import { formatCOP, formatDateTime } from '@/shared/lib/format'
import { Modal } from '@/shared/ui/Modal'
import { Button } from '@/shared/ui/Button'
import { Badge } from '@/shared/ui/Badge'

const PROVIDER_LABEL: Record<string, string> = {
  bre_b: 'Bre-B',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  bancolombia: 'Bancolombia',
}

export function PaymentConfirmedModal({
  notification,
  onClose,
}: {
  notification: PaymentNotification | null
  onClose: () => void
}) {
  return (
    <Modal
      open={Boolean(notification)}
      onClose={onClose}
      title="Pago verificado"
      description="La transferencia fue conciliada con el pedido"
      size="sm"
      footer={
        <Button
          className="w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
          onClick={onClose}
        >
          <Check className="h-4 w-4" />
          Listo
        </Button>
      }
    >
      {notification && (
        <div className="text-center">
          <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-emerald-500/15" />
            <span className="absolute inset-3 rounded-full border border-emerald-400/30 bg-emerald-500/20" />
            <span className="relative flex h-14 w-14 animate-check-pop items-center justify-center rounded-full bg-emerald-500 text-ink-950 shadow-[0_0_40px_rgba(16,185,129,.55)]">
              <Check className="h-8 w-8 stroke-[3]" />
            </span>
          </div>

          <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">
            Confirmado
          </p>
          <p className="mt-1 font-display text-4xl text-ink-900">
            {formatCOP(notification.amount)}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {PROVIDER_LABEL[notification.provider] ?? notification.provider}
            {notification.order_code ? ` · ${notification.order_code}` : ''}
          </p>

          <div className="mt-4 space-y-1.5 rounded-2xl border border-ink-100 bg-ink-50 p-3 text-left text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-ink-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Remitente
              </span>
              <span className="font-semibold text-ink-800">
                {notification.sender_name ?? 'No informado'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-ink-500">
                <Clock3 className="h-3.5 w-3.5" />
                Recibido
              </span>
              <span className="font-semibold text-ink-800">
                {formatDateTime(notification.confirmed_at ?? notification.received_at)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-500">Referencia</span>
              <Badge variant="success">{notification.reference ?? '—'}</Badge>
            </div>
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
            El pedido quedó como pagado y se sumará al cierre de caja. La animación
            confirma que el listener Bre-B validó la transferencia.
          </p>
        </div>
      )}
    </Modal>
  )
}
