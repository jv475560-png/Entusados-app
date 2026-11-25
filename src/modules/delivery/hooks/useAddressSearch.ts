import { useEffect, useState } from 'react'

export interface AddressSuggestion {
  id: string
  label: string
  lat: number
  lng: number
  neighborhood: string
}

interface NominatimPlace {
  place_id?: number | string
  display_name?: string
  lat?: string
  lon?: string
  address?: Record<string, string>
}

export function useAddressSearch(query: string, enabled = true) {
  const [results, setResults] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!enabled || query.trim().length < 4) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      try {
        const url =
          'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1' +
          '&limit=6&countrycodes=co&accept-language=es&q=' +
          encodeURIComponent(query.trim())
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        })
        if (!response.ok) throw new Error('search failed')
        const data = (await response.json()) as NominatimPlace[]
        setResults(
          data
            .filter((place) => place.lat && place.lon)
            .map((place) => {
              const address = place.address ?? {}
              return {
                id: String(place.place_id ?? `${place.lat}-${place.lon}`),
                label: place.display_name ?? '',
                lat: Number(place.lat),
                lng: Number(place.lon),
                neighborhood:
                  address.neighbourhood ??
                  address.suburb ??
                  address.city_district ??
                  address.town ??
                  address.municipality ??
                  '',
              }
            }),
        )
      } catch {
        if (!controller.signal.aborted) setResults([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 450)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [query, enabled])

  return { results, loading }
}
