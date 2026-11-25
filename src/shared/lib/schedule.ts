import type { DeliveryChannel } from '@/shared/types'

export const STORE_TIMEZONE = 'America/Bogota'

export function bogotaDateKey(value: string | Date = new Date()): string {
  const date = typeof value === 'string' ? new Date(value) : value
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
  dom: 0,
  lun: 1,
  mar: 2,
  mié: 3,
  jue: 4,
  vie: 5,
  sáb: 6,
}

export interface BogotaTime {
  dayOfWeek: number
  minutes: number
  label: string
}

/** Hora local de Bogotá sin importar el timezone del dispositivo. */
export function getBogotaTime(date = new Date()): BogotaTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon'
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0')

  return {
    dayOfWeek: WEEKDAYS[weekday] ?? 0,
    minutes: hour * 60 + minute,
    label: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
  }
}

export function channelLabel(channel: DeliveryChannel): string {
  return channel === 'own' ? 'Domiciliario ENTUSADOS' : channel === 'rappi' ? 'Rappi' : 'DiDi Food'
}

export function orderChannelToDelivery(channel: DeliveryChannel): 'own_delivery' | 'rappi' | 'didi' {
  return channel === 'own' ? 'own_delivery' : channel
}
