import { useCallback, useEffect, useState } from 'react'
import type { ChatMessage } from '@/shared/types'
import { isSupabaseEnabled, supabase } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'

export function useOrderChat(orderId: string | undefined) {
  const demoMessages = useDemoStore((state) => state.messages)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(isSupabaseEnabled)

  const load = useCallback(async () => {
    if (!orderId || !isSupabaseEnabled || !supabase) return
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .limit(200)
    setMessages((data ?? []) as ChatMessage[])
    setLoading(false)
  }, [orderId])

  useEffect(() => {
    if (!orderId) {
      setMessages([])
      return
    }

    if (!isSupabaseEnabled || !supabase) {
      setMessages(demoMessages.filter((message) => message.order_id === orderId))
      setLoading(false)
      return
    }

    void load()
    const channel = supabase
      .channel(`chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        () => void load(),
      )
      .subscribe()

    return () => {
      void supabase?.removeChannel(channel)
    }
  }, [orderId, demoMessages, load])

  const send = useCallback(
    async (body: string, role: ChatMessage['sender_role'], senderName: string) => {
      if (!orderId || !body.trim()) return
      if (!isSupabaseEnabled || !supabase) {
        useDemoStore.getState().sendMessage(orderId, role, senderName, body.trim())
        return
      }
      await supabase.from('chat_messages').insert({
        order_id: orderId,
        sender_role: role,
        sender_name: senderName,
        body: body.trim(),
      })
      await load()
    },
    [orderId, load],
  )

  return { messages, loading, send }
}
