import { Bike, Store, Truck } from 'lucide-react'
import { useDeliveryRouting } from '../hooks/useDeliveryRouting'
import { useClientLocation } from '@/shared/contexts/ClientLocationContext'
import { useCartStore } from '@/modules/ordering/store/cartStore'
import { channelLabel } from '@/shared/lib/schedule'
import type { DeliveryChannel } from '@/shared/types'
import type { CoverageLocation } from '@/shared/lib/coverage'

export function ChannelIcon({ channel, className }: { channel: DeliveryChannel; className?: string }) {
  if (channel === 'own') return <Truck className={className} />
  if (channel === 'rappi') return <Bike className={className} />
  return <Store className={className} />
}

/**
 * Solo se muestra el aviso cuando el cliente está fuera de cobertura.
 * No mostramos estados de "verificando" ni mensajes cuando hay cobertura.
 */
export function DeliveryRouteBanner({
  compact = false,
  location,
}: {
  compact?: boolean
  location?: CoverageLocation
}) {
  const fulfillment = useCartStore((state) => state.fulfillment)
  const geo = useClientLocation()
  const { route } = useDeliveryRouting(
    location ?? {
      lat: geo.position?.lat ?? null,
      lng: geo.position?.lng ?? null,
      neighborhood: geo.neighborhood || null,
    },
  )

  if (fulfillment !== 'delivery') return null
  if (route.status !== 'outside') return null

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
        <ChannelIcon channel={route.channel} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink-900">
          Fuera de cobertura · {channelLabel(route.channel)}
        </p>
        <p className="text-xs text-ink-600">
          {compact
            ? 'Tu barrio no está en la zona del domiciliario propio. El pedido se asigna al agregador externo.'
            : 'Tu barrio no está en la zona del domiciliario propio. El pedido se enruta automáticamente a Rappi o DiDi Food.'}
        </p>
      </div>
    </div>
  )
}
