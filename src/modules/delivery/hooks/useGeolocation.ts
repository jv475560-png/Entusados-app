import { useCallback, useEffect, useRef, useState } from 'react'
import type { GeoPosition, ReverseGeocodeResult } from '@/shared/types'
import { reverseGeocode } from '@/shared/lib/geocoding'

interface UseGeolocationOptions {
  auto?: boolean
}

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Permiso de ubicación denegado. Puedes escribir tu dirección manualmente.',
  2: 'No pudimos obtener tu ubicación. Verifica tu GPS.',
  3: 'La ubicación tardó demasiado. Intenta de nuevo.',
}

export function useGeolocation({ auto = true }: UseGeolocationOptions = {}) {
  const [position, setPosition] = useState<GeoPosition | null>(null)
  const [address, setAddress] = useState<ReverseGeocodeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const autoStartedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  const detect = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Este dispositivo no soporta geolocalización.')
      return null
    }

    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('La ubicación requiere HTTPS.')
      return null
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' })
      if (permission.state === 'denied') {
        setError('Permiso de ubicación denegado.')
        return null
      }
    } catch {
      // Permissions API no disponible; seguimos con getCurrentPosition.
    }

    setLoading(true)
    setError(null)

    try {
      const geo = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        })
      })

      const nextPosition: GeoPosition = {
        lat: geo.coords.latitude,
        lng: geo.coords.longitude,
        accuracy: geo.coords.accuracy,
        timestamp: geo.timestamp,
      }

      if (!mountedRef.current) return null
      setPosition(nextPosition)

      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const result = await reverseGeocode(nextPosition.lat, nextPosition.lng, controller.signal)
        if (mountedRef.current) setAddress(result)
      } catch {
        if (mountedRef.current) {
          setAddress({
            address: `${nextPosition.lat.toFixed(5)}, ${nextPosition.lng.toFixed(5)}`,
            city: 'Bogotá',
            neighborhood: '',
          })
          setError('Ubicación capturada, pero no pudimos traducirla a una dirección.')
        }
      }

      return nextPosition
    } catch (err) {
      const geoError = err as GeolocationPositionError
      if (mountedRef.current) {
        setError(ERROR_MESSAGES[geoError?.code ?? 0] ?? 'No pudimos obtener tu ubicación.')
      }
      return null
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (auto && !autoStartedRef.current) {
      autoStartedRef.current = true
      void detect()
    }
  }, [auto, detect])

  const clear = useCallback(() => {
    setPosition(null)
    setAddress(null)
    setError(null)
  }, [])

  return {
    position,
    address: address?.address ?? '',
    city: address?.city ?? 'Bogotá',
    neighborhood: address?.neighborhood ?? '',
    loading,
    geocoding: loading,
    error,
    detect,
    clear,
  }
}
