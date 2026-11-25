import type { DeliveryChannel, DeliveryZone } from '@/shared/types'
import { distanceKm } from './geocoding'

export interface CoverageLocation {
  lat: number | null
  lng: number | null
  neighborhood: string | null
  address?: string | null
}

export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
}

export function zoneMatchesNeighborhood(
  zone: DeliveryZone,
  neighborhood: string | null,
  address?: string | null,
): boolean {
  const haystack = normalize([neighborhood, address].filter(Boolean).join(' '))
  if (!haystack) return false
  const names = [zone.name, ...(zone.aliases ?? [])].map(normalize).filter(Boolean)
  return names.some((name) => haystack.includes(name) || name.includes(haystack))
}

export function zoneMatchesCoordinates(zone: DeliveryZone, lat: number, lng: number): boolean {
  if (zone.center_lat == null || zone.center_lng == null || zone.radius_m <= 0) return false
  const km = distanceKm(
    { lat, lng },
    { lat: zone.center_lat, lng: zone.center_lng },
  )
  return km * 1000 <= zone.radius_m
}

export function findCoverageZone(
  zones: DeliveryZone[],
  location: CoverageLocation,
): DeliveryZone | null {
  const active = zones
    .filter((zone) => zone.is_active)
    .sort((a, b) => {
      if (a.handling === b.handling) return 0
      return a.handling === 'front' ? -1 : 1
    })

  const byName = active.find((zone) =>
    zoneMatchesNeighborhood(zone, location.neighborhood, location.address),
  )
  if (byName) return byName

  if (location.lat != null && location.lng != null) {
    const byDistance = active.find((zone) =>
      zoneMatchesCoordinates(zone, location.lat as number, location.lng as number),
    )
    if (byDistance) return byDistance
  }

  return null
}

export function resolveCoverageRoute(
  zones: DeliveryZone[],
  location: CoverageLocation,
  fallback: DeliveryChannel = 'rappi',
) {
  const hasLocation =
    Boolean(location.neighborhood) ||
    Boolean(location.address) ||
    (location.lat != null && location.lng != null)

  if (!hasLocation) {
    return {
      channel: fallback,
      handling: 'own' as const,
      zone_id: null,
      zone_name: null,
      is_fallback: true,
      status: 'unknown' as const,
    }
  }

  const zone = findCoverageZone(zones, location)
  if (zone) {
    return {
      channel: 'own' as const,
      handling: zone.handling,
      zone_id: zone.id,
      zone_name: zone.name,
      is_fallback: false,
      status: 'inside' as const,
    }
  }

  return {
    channel: fallback,
    handling: 'own' as const,
    zone_id: null,
    zone_name: null,
    is_fallback: true,
    status: 'outside' as const,
  }
}
