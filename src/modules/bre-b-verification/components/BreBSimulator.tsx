import { useState } from 'react'
import { Send, Wand2 } from 'lucide-react'
import type { Order, PaymentProvider } from '@/shared/types'
import { formatCOP } from '@/shared/lib/format'
import { useBreBVerifications } from '../hooks/useBreBVerifications'
import { Button } from '@/shared/ui/Button'
import { Field, Input, Select } from '@/shared/ui/Input'

const PROVIDERS: Array<{ value: PaymentProvider; label: string }> = [
  { value: 'bre_b', label: 'Bre-B' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'bancolombia', label: 'Bancolombia' },
]

export function BreBSimulator({ orders }: { orders: Order[] }) {
  const { simulate } = useBreBVerifications()
  const activeOrders = orders.filter((order) => order.payment_status !== 'confirmed')
  const [orderId, setOrderId] = useState('')
  const [provider, setProvider] = useState<PaymentProvider>('bre_b')
  const [amount, setAmount] = useState('')
  const [senderName, setSenderName] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)

  const submit = async () => {
    const selected = activeOrders.find((order) => order.id === orderId)
    const numericAmount = Number(amount) || selected?.total || 0
    if (numericAmount <= 0) {
      setFeedback('Indica un monto válido.')
      return
    }

    await simulate({
      orderId: selected?.id ?? null,
      orderCode: selected?.code ?? null,
      provider,
      amount: numericAmount,
      reference: selected?.code,
      senderName: senderName || selected?.customer_name,
    })

    setFeedback('Notificación de pago recibida (estado pendiente).')
    setAmount('')
    setSenderName('')
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Pedido a conciliar">
          <Select
            value={orderId}
            onChange={(event) => {
              setOrderId(event.target.value)
              const selected = activeOrders.find((order) => order.id === event.target.value)
              if (selected) setAmount(String(selected.total))
            }}
          >
            <option value="">Sin pedido (solo prueba)</option>
            {activeOrders.slice(0, 20).map((order) => (
              <option key={order.id} value={order.id}>
                {order.code} · {order.customer_name} · {formatCOP(order.total)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Banco / proveedor">
          <Select
            value={provider}
            onChange={(event) => setProvider(event.target.value as PaymentProvider)}
          >
            {PROVIDERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Monto (COP)">
          <Input
            type="number"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="35000"
          />
        </Field>
        <Field label="Remitente">
          <Input
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            placeholder="Nombre de quien transfiere"
          />
        </Field>
      </div>

      {feedback && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-700">
          {feedback}
        </p>
      )}

      <Button onClick={() => void submit()}>
        <Send className="h-4 w-4" />
        Simular notificación bancaria
      </Button>

      <p className="flex items-start gap-1.5 text-[11px] text-ink-400">
        <Wand2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        En producción este formulario se reemplaza por el webhook de Bre-B/banco
        (<code>supabase/functions/bre-b-webhook</code>). El pago solo cambia a confirmado cuando
        un cajero o admin lo valida.
      </p>
    </div>
  )
}
