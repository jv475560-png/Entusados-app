import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useOrderChat } from '../hooks/useOrderChat'
import { useAuthStore } from '@/shared/services/auth'
import { formatDateTime } from '@/shared/lib/format'
import { Input } from '@/shared/ui/Input'

export function ChatPanel({
  orderId,
  variant = 'customer',
}: {
  orderId: string | undefined
  variant?: 'customer' | 'store'
}) {
  const { messages, send } = useOrderChat(orderId)
  const fullName = useAuthStore((state) => state.fullName)
  const role = useAuthStore((state) => state.role)
  const [body, setBody] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const senderRole = variant === 'store' || role === 'admin' || role === 'cashier' ? 'store' : 'customer'
  const senderName = variant === 'store' ? 'ENTUSADOS' : fullName

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const submit = async () => {
    if (!body.trim()) return
    await send(body, senderRole, senderName)
    setBody('')
  }

  return (
    <div className="flex h-80 flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white">
      <div className="flex items-center justify-between border-b border-ink-100 bg-ink-50/60 px-4 py-2.5">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-500">Chat del pedido</p>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          En vivo
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="pt-8 text-center text-xs text-ink-400">
            Escribe para coordinar con la tienda o el domiciliario.
          </p>
        )}
        {messages.map((message) => {
          const mine =
            senderRole === 'store' ? message.sender_role === 'store' : message.sender_role === 'customer'
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? 'rounded-br-sm bg-ink-900 text-white'
                    : 'rounded-bl-sm bg-ink-100 text-ink-800'
                }`}
              >
                <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                  {message.sender_name}
                </p>
                <p>{message.body}</p>
                <p className="mt-1 text-right text-[10px] opacity-50">
                  {formatDateTime(message.created_at)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-2 border-t border-ink-100 p-2">
        <Input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void submit()
          }}
          placeholder="Escribe un mensaje..."
          className="h-9"
        />
        <button
          onClick={() => void submit()}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-ink-900 text-white hover:bg-ink-800"
          aria-label="Enviar mensaje"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
