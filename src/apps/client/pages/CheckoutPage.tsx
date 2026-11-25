import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Loader2,
  LocateFixed,
  MapPin,
  Search,
  Truck,
  UtensilsCrossed,
} from 'lucide-react'
import { cartSubtotal, useCartStore } from '@/modules/ordering/store/cartStore'
import { useCreateOrder } from '@/modules/ordering/hooks/useCreateOrder'
import { useDeliveryRouting } from '@/modules/delivery/hooks/useDeliveryRouting'
import { useAddressSearch } from '@/modules/delivery/hooks/useAddressSearch'
import { DeliveryRouteBanner } from '@/modules/delivery/components/DeliveryRouteBanner'
import { useClientLocation } from '@/shared/contexts/ClientLocationContext'
import { useAuthStore } from '@/shared/services/auth'
import { isSupabaseEnabled } from '@/shared/services/supabase'
import { useDemoStore } from '@/shared/services/demo/demoStore'
import { formatCOP } from '@/shared/lib/format'
import { channelLabel } from '@/shared/lib/schedule'
import { Button } from '@/shared/ui/Button'
import { Field, Input, Textarea } from '@/shared/ui/Input'
import { Badge } from '@/shared/ui/Badge'
import { ProductImage } from '@/shared/ui/Brand'

const CHECKOUT_KEY = 'entusados-checkout-v1'

interface SavedCheckout {
  name: string
  phone: string
  address: string
  isConjunto: boolean
  tower: string
  apartment: string
  leaveAtGate?: boolean
  lat: number | null
  lng: number | null
  neighborhood: string
}

function readSavedCheckout(): SavedCheckout | null {
  try {
    const raw = localStorage.getItem(CHECKOUT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedCheckout
  } catch {
    return null
  }
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const items = useCartStore((state) => state.items)
  const fulfillment = useCartStore((state) => state.fulfillment)
  const clear = useCartStore((state) => state.clear)
  const fullName = useAuthStore((state) => state.fullName)
  const phone = useAuthStore((state) => state.phone)
  const setProfile = useAuthStore((state) => state.setProfile)

  const saved = useRef<SavedCheckout | null>(readSavedCheckout())
  const geo = useClientLocation()

  const customerName =
    saved.current?.name ||
    (fullName && fullName !== 'Cliente ENTUSADOS' ? fullName : 'Cliente ENTUSADOS')
  const customerPhone = saved.current?.phone || phone || ''
  const [address, setAddress] = useState(saved.current?.address || '')
  const [isConjunto, setIsConjunto] = useState(saved.current?.isConjunto ?? false)
  const [tower, setTower] = useState(saved.current?.tower || '')
  const [apartment, setApartment] = useState(saved.current?.apartment || '')
  const [leaveAtGate, setLeaveAtGate] = useState(saved.current?.leaveAtGate ?? false)
  const [selectedPlace, setSelectedPlace] = useState<{
    lat: number
    lng: number
    neighborhood: string
  } | null>(
    saved.current?.lat != null && saved.current?.lng != null
      ? {
          lat: saved.current.lat,
          lng: saved.current.lng,
          neighborhood: saved.current.neighborhood || '',
        }
      : null,
  )
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const addressTouched = useRef(Boolean(saved.current?.address))
  const requestedGeo = useRef(false)

  const effectiveLocation = {
    lat: selectedPlace?.lat ?? geo.position?.lat ?? null,
    lng: selectedPlace?.lng ?? geo.position?.lng ?? null,
    neighborhood: selectedPlace?.neighborhood ?? geo.neighborhood ?? null,
    address: address.trim() || null,
  }

  const { route } = useDeliveryRouting(effectiveLocation)
  const { results: suggestions, loading: searching } = useAddressSearch(
    address,
    showSuggestions && fulfillment === 'delivery',
  )
  const { createOrder, submitting, error } = useCreateOrder()

  useEffect(() => {
    if (geo.address && !addressTouched.current) {
      setAddress(geo.address)
    }
  }, [geo.address])

  useEffect(() => {
    if (
      fulfillment === 'delivery' &&
      !requestedGeo.current &&
      !geo.position &&
      !geo.loading
    ) {
      requestedGeo.current = true
      void geo.detect()
    }
  }, [fulfillment, geo.position, geo.loading, geo.detect])

  const subtotal = cartSubtotal(items)
  const fee = fulfillment === 'delivery' ? 3500 : 0
  const total = subtotal + fee

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-100 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-ink-700">No hay productos en el carrito.</p>
        <Button className="mt-4" onClick={() => navigate('/')}>
          Volver al menú
        </Button>
      </div>
    )
  }

  const pickSuggestion = (suggestion: {
    label: string
    lat: number
    lng: number
    neighborhood: string
  }) => {
    setAddress(suggestion.label)
    setSelectedPlace({
      lat: suggestion.lat,
      lng: suggestion.lng,
      neighborhood: suggestion.neighborhood,
    })
    setShowSuggestions(false)
    addressTouched.current = true
  }

  const submit = async () => {
    setLocalError(null)
    if (fulfillment === 'delivery' && !address.trim()) {
      return setLocalError('Necesitamos tu dirección para el domicilio.')
    }
    if (fulfillment === 'delivery' && isConjunto && !tower.trim()) {
      return setLocalError('Indica la torre del conjunto.')
    }
    if (fulfillment === 'delivery' && isConjunto && !apartment.trim()) {
      return setLocalError('Indica el apartamento del conjunto.')
    }

    const fullAddress = isConjunto
      ? `${address.trim()}, Torre ${tower.trim()}, Apto ${apartment.trim()}`
      : address.trim()

    const order = await createOrder({
      customerName,
      customerPhone,
      channel:
        fulfillment === 'local'
          ? 'local'
          : route.handling === 'front'
            ? 'front_delivery'
            : route.channel === 'own'
              ? 'own_delivery'
              : route.channel,
      paymentMethod: 'bre_b',
      notes:
        fulfillment === 'delivery' && leaveAtGate
          ? 'Dejar el pedido en portería'
          : undefined,
      deliveryAddress: fulfillment === 'delivery' ? fullAddress : undefined,
      deliveryLat: fulfillment === 'delivery' ? effectiveLocation.lat ?? undefined : undefined,
      deliveryLng: fulfillment === 'delivery' ? effectiveLocation.lng ?? undefined : undefined,
      deliveryNeighborhood:
        fulfillment === 'delivery'
          ? effectiveLocation.neighborhood || undefined
          : undefined,
      items: items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        toppings: item.toppings,
        notes: item.notes || undefined,
      })),
    })

    if (!order) return

    setProfile({ fullName: customerName, phone: customerPhone })

    try {
      localStorage.setItem(
        CHECKOUT_KEY,
        JSON.stringify({
          name: customerName,
          phone: customerPhone,
          address: address.trim(),
          isConjunto,
          tower: tower.trim(),
          apartment: apartment.trim(),
          leaveAtGate,
          lat: effectiveLocation.lat,
          lng: effectiveLocation.lng,
          neighborhood: effectiveLocation.neighborhood,
        }),
      )
    } catch {
      // almacenamiento no disponible
    }

    if (!isSupabaseEnabled) {
      useDemoStore.getState().simulatePayment({
        orderId: order.id,
        orderCode: order.code,
        provider: 'bre_b',
        amount: order.total,
        reference: order.code,
        senderName: customerName,
      })
    }

    clear()
    navigate(`/success/${order.id}`)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl text-ink-900">FINALIZAR PEDIDO</h1>
          <p className="text-xs text-ink-400">
            {fulfillment === 'delivery'
              ? 'Pedido a domicilio.'
              : 'Pedido en punto físico · el equipo define mesa o para llevar.'}
          </p>
        </div>

        <section className="rounded-2xl border border-ink-100 bg-white p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white">
                1
              </span>
              <h2 className="text-sm font-bold text-ink-900">
                {fulfillment === 'delivery' ? 'Dirección de entrega' : 'Estoy Entusado'}
              </h2>
            </div>
            {fulfillment === 'delivery' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  addressTouched.current = false
                  setSelectedPlace(null)
                  setShowSuggestions(false)
                  void geo.detect()
                }}
                disabled={geo.loading}
              >
                {geo.loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <LocateFixed className="h-3.5 w-3.5" />
                )}
                Usar mi ubicación
              </Button>
            )}
          </div>

          {fulfillment === 'delivery' && (geo.error || !window.isSecureContext) && (
            <p className="mt-1 text-right text-[11px] font-semibold text-red-500">
              Denegado, ingresa la dirección.
            </p>
          )}

          {fulfillment === 'delivery' ? (
            <div className="mt-3 space-y-3">
              <DeliveryRouteBanner compact location={effectiveLocation} />

              <Field
                label="Dirección"
                hint={
                  geo.position
                    ? `GPS: ${geo.position.lat.toFixed(5)}, ${geo.position.lng.toFixed(5)} · precisión ${Math.round(geo.position.accuracy)} m`
                    : 'Busca por dirección o nombre del conjunto.'
                }
              >
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-ink-400" />
                  <Textarea
                    value={address}
                    onChange={(event) => {
                      addressTouched.current = true
                      setAddress(event.target.value)
                      setSelectedPlace(null)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Calle 45 # 12-30, conjunto El Ensueño…"
                    className="pl-9"
                  />
                  {showSuggestions && address.trim().length >= 4 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-xl">
                      {searching && (
                        <p className="flex items-center gap-2 px-3 py-2 text-xs text-ink-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Buscando direcciones…
                        </p>
                      )}
                      {!searching &&
                        suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => pickSuggestion(suggestion)}
                            className="flex w-full items-start gap-2 border-b border-ink-100 px-3 py-2 text-left text-xs text-ink-600 last:border-0 hover:bg-ink-50"
                          >
                            <Search className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-300" />
                            <span className="line-clamp-2">{suggestion.label}</span>
                          </button>
                        ))}
                      {!searching && suggestions.length === 0 && (
                        <p className="px-3 py-2 text-xs text-ink-400">
                          Sin resultados. Puedes escribir la dirección manualmente.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Field>

              <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700">
                <input
                  type="checkbox"
                  checked={isConjunto}
                  onChange={(event) => setIsConjunto(event.target.checked)}
                  className="h-4 w-4 accent-brand-500"
                />
                Es conjunto
              </label>

              {isConjunto && (
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Torre">
                    <Input
                      value={tower}
                      onChange={(event) => setTower(event.target.value)}
                      placeholder="Ej: 3"
                    />
                  </Field>
                  <Field label="Apartamento">
                    <Input
                      value={apartment}
                      onChange={(event) => setApartment(event.target.value)}
                      placeholder="Ej: 402"
                    />
                  </Field>
                </div>
              )}

              <label className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-semibold text-ink-700">
                <input
                  type="checkbox"
                  checked={leaveAtGate}
                  onChange={(event) => setLeaveAtGate(event.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                Deja el pedido en portería
              </label>
            </div>
          ) : (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800">
              <UtensilsCrossed className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Estás en el punto físico ENTUSADOS. Al recibir tu pedido el equipo te preguntará
                si es <strong>para la mesa o para llevar</strong>. No se cobra domicilio.
              </p>
            </div>
          )}
        </section>

        {(localError || error) && (
          <p className="rounded-xl bg-accent-50 px-3 py-2 text-sm font-medium text-accent-700">
            {localError ?? error}
          </p>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-500">Tu pedido</h2>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <ProductImage
                  product={item.product}
                  className="h-10 w-10 shrink-0 rounded-lg"
                  emojiClassName="text-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink-800">
                    {item.quantity}× {item.product.name}
                  </p>
                  {item.toppings.length > 0 && (
                    <p className="truncate text-[10px] text-ink-400">
                      {item.toppings.map((t) => t.name).join(', ')}
                    </p>
                  )}
                </div>
                <span className="text-xs font-bold">{formatCOP(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <dl className="mt-3 space-y-1.5 border-t border-dashed border-ink-200 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd>{formatCOP(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Domicilio</dt>
              <dd>{fee > 0 ? formatCOP(fee) : '—'}</dd>
            </div>
            <div className="flex justify-between text-base font-extrabold">
              <dt>Total</dt>
              <dd>{formatCOP(total)}</dd>
            </div>
          </dl>

          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-400">
            {fulfillment === 'delivery' ? (
              <>
                <Truck className="h-3.5 w-3.5" />
                {route.handling === 'front'
                  ? 'Enfrente · entrega directa ENTUSADOS'
                  : route.status === 'outside'
                    ? `Fuera de cobertura · ${channelLabel(route.channel)}`
                    : channelLabel(route.channel)}
              </>
            ) : (
              <>
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Estoy Entusado · sin domicilio
              </>
            )}
          </div>

          <Button
            className="mt-4 w-full bg-emerald-500 text-ink-950 hover:bg-emerald-400"
            size="lg"
            loading={submitting}
            onClick={() => void submit()}
          >
            Confirmar pedido · {formatCOP(total)}
          </Button>
          <p className="mt-2 text-center text-[10px] text-ink-400">
            Tu pedido llega directo a la cocina de ENTUSADOS.
          </p>
          <Link
            to="/cart"
            className="mt-2 block text-center text-xs font-semibold text-ink-400 hover:text-ink-700"
          >
            Volver al carrito
          </Link>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Badge variant="outline">Pago seguro</Badge>
          <Badge variant="outline">Bre-B</Badge>
          <Badge variant="outline">Nequi</Badge>
        </div>
      </aside>
    </div>
  )
}
