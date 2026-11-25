import type { ReverseGeocodeResult } from '@/shared/types'

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse'

interface NominatimResponse {
  display_name?: string
  address?: Record<string, string>
}

/** Reverse geocoding vía OpenStreetMap/Nominatim. Sin API key. */
export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<ReverseGeocodeResult> {
  const url = `${NOMINATIM}?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
  const response = await fetch(url, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) throw new Error('No se pudo obtener la dirección')

  const data = (await response.json()) as NominatimResponse
  const address = data.address ?? {}

  const street = [address.road, address.house_number].filter(Boolean).join(' ')
  const neighborhood =
    address.neighbourhood ?? address.suburb ?? address.city_district ?? address.town ?? ''
  const city = address.city ?? address.municipality ?? address.state ?? 'Bogotá'

  return {
    address: [street, neighborhood, city].filter(Boolean).join(', ') || data.display_name || '',
    city,
    neighborhood,
  }
}

/** Distancia haversine en km entre dos coordenadas. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}
