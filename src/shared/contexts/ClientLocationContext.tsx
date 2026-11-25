import { createContext, useContext, type ReactNode } from 'react'
import { useGeolocation } from '@/modules/delivery/hooks/useGeolocation'

type ClientLocationValue = ReturnType<typeof useGeolocation>

const ClientLocationContext = createContext<ClientLocationValue | null>(null)

export function ClientLocationProvider({ children }: { children: ReactNode }) {
  const location = useGeolocation({ auto: true })
  return (
    <ClientLocationContext.Provider value={location}>
      {children}
    </ClientLocationContext.Provider>
  )
}

export function useClientLocation(): ClientLocationValue {
  const context = useContext(ClientLocationContext)
  if (!context) throw new Error('useClientLocation debe usarse dentro de ClientLocationProvider')
  return context
}
