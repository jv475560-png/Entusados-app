import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CheckCircle2, Copy, MessageCircle } from 'lucide-react'
import { useOrder } from '@/modules/ordering/hooks/useOrders'
import { formatCOP } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { EmptyState, Skeleton } from '@/shared/ui/Feedback'

const PAYMENT_NUMBER = '3144358430'
const WHATSAPP_NUMBER = '573144358430'

export function orderNumberFromCode(code: string): string {
  const parts = code.split('-')
  const suffix = parts[parts.length - 1] ?? ''
  const numeric = Number.parseInt(suffix, 10)
  if (Number.isFinite(numeric)) return String(numeric)
  const digits = code.replace(/\D/g, '')
  return digits ? String(Number.parseInt(digits.slice(-4), 10)) : code
}

export function OrderSuccessPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { order, loading } = useOrder(orderId)
  const [copied, setCopied] = useState(false)

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-4">
        <Skeleton className="h-80" />
      </div>
    )
  }

  if (!order) {
    return (
      <EmptyState
        title="No encontramos el pedido"
        description="Vuelve al menú e intenta de nuevo."
        action={<Button onClick={() => navigate('/')}>Volver al menú</Button>}
      />
    )
  }

  const number = orderNumberFromCode(order.code)
  const amount = formatCOP(order.total).replace(/\s+/g, '')
  const message = `Realicé mi pedido!\n⚡Orden ${number}.\n\nYa te envío comprobante de pago. \n\n📎${amount} por Bre-B  o Nequi al ${PAYMENT_NUMBER}`

  const openWhatsApp = () => {
    const text = encodeURIComponent(message)
    const userAgent = navigator.userAgent

    if (/Android/i.test(userAgent)) {
      window.location.href = `intent://send?phone=${WHATSAPP_NUMBER}&text=${text}#Intent;package=com.whatsapp;scheme=whatsapp;end`
      return
    }

    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      window.location.href = `whatsapp://send?phone=${WHATSAPP_NUMBER}&text=${text}`
      return
    }

    window.open(
      `https://web.whatsapp.com/send?phone=${WHATSAPP_NUMBER}&text=${text}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className="mx-auto max-w-lg py-4">
      <div className="rounded-3xl border border-white/10 bg-ink-900 p-6 text-center shadow-card">
        <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-emerald-500/15" />
          <span className="absolute inset-3 rounded-full border border-emerald-400/30 bg-emerald-500/20" />
          <span className="relative flex h-14 w-14 animate-check-pop items-center justify-center rounded-full bg-emerald-500 text-ink-950 shadow-[0_0_40px_rgba(16,185,129,.55)]">
            <CheckCircle2 className="h-8 w-8 stroke-[2.5]" />
          </span>
        </div>

        <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400">
          Pedido realizado
        </p>
        <p className="mt-1 font-display text-3xl text-white">Orden {number}.</p>
        <p className="mt-1 text-sm text-white/50">
          Bre-B · {formatCOP(order.total)}
        </p>

        <div className="mt-5 rounded-2xl border border-brand-400/20 bg-brand-500/10 p-4 text-left">
          <p className="text-xs font-bold text-brand-200">
            Realiza el pago para iniciar la orden
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Transfiere por Bre-B o Nequi al número o llave:
          </p>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-ink-950/70 px-3 py-2">
            <span className="text-lg font-extrabold tracking-wide text-white">
              {PAYMENT_NUMBER}
            </span>
            <button
              onClick={() => {
                void navigator.clipboard?.writeText(PAYMENT_NUMBER)
                setCopied(true)
                window.setTimeout(() => setCopied(false), 1500)
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/20"
            >
              <Copy className="h-3 w-3" />
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/50">
            Envía el comprobante por WhatsApp para que el equipo confirme el pago e inicie la
            preparación.
          </p>
        </div>

        <Button
          className="mt-4 w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
          size="lg"
          onClick={openWhatsApp}
        >
          <MessageCircle className="h-5 w-5" />
          Volver a WhatsApp
        </Button>

        <div className="mt-3 text-xs">
          <button
            onClick={() => navigate('/')}
            className="font-semibold text-white/40 hover:text-white/70"
          >
            Volver al menú
          </button>
        </div>

        <p className="mt-3 text-[10px] text-white/25">
          {PAYMENT_NUMBER} · {order.customer_name}
        </p>
      </div>
    </div>
  )
}
