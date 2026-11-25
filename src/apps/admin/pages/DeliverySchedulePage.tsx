import { useEffect, useState } from 'react'
import {
  Bike,
  Copy,
  MapPin,
  Pencil,
  Plus,
  Radio,
  Store,
  Trash2,
  Truck,
} from 'lucide-react'
import { useDeliveryRouting } from '@/modules/delivery/hooks/useDeliveryRouting'
import type { DeliveryChannel, DeliveryZone } from '@/shared/types'
import { channelLabel, getBogotaTime } from '@/shared/lib/schedule'
import { formatCOP } from '@/shared/lib/format'
import { Badge } from '@/shared/ui/Badge'
import { Button } from '@/shared/ui/Button'
import { Field, Input, Select } from '@/shared/ui/Input'
import { PageHeader, SectionCard, StatCard } from '../components/AdminUi'

const EMPTY_FORM = {
  name: '',
  aliases: '',
  center_lat: '',
  center_lng: '',
  radius_m: '1200',
  handling: 'own' as 'own' | 'front',
}

export function DeliveryCoveragePage() {
  const {
    zones,
    deliveryFee,
    defaultChannel,
    toggleZone,
    updateZone,
    addZone,
    removeZone,
    setDefaultChannel,
    setDeliveryFee,
  } = useDeliveryRouting()

  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [fee, setFee] = useState(String(deliveryFee))
  const [feedback, setFeedback] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => setFee(String(deliveryFee)), [deliveryFee])

  const activeZones = zones.filter((zone) => zone.is_active)
  const clock = getBogotaTime()

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
  }

  const startEdit = (zone: DeliveryZone) => {
    setEditingId(zone.id)
    setForm({
      name: zone.name,
      aliases: (zone.aliases ?? []).join(', '),
      center_lat: zone.center_lat != null ? String(zone.center_lat) : '',
      center_lng: zone.center_lng != null ? String(zone.center_lng) : '',
      radius_m: String(zone.radius_m ?? 0),
      handling: zone.handling ?? 'own',
    })
  }

  const submit = async () => {
    if (!form.name.trim()) {
      setFeedback('Escribe el nombre del barrio o conjunto.')
      return
    }
    const payload = {
      name: form.name.trim(),
      aliases: form.aliases
        .split(',')
        .map((alias) => alias.trim())
        .filter(Boolean),
      center_lat: form.center_lat ? Number(form.center_lat) : null,
      center_lng: form.center_lng ? Number(form.center_lng) : null,
      radius_m: Number(form.radius_m) || 0,
      handling: form.handling,
      is_active: true,
    }

    if (editingId) {
      await updateZone(editingId, payload)
      setFeedback('Zona actualizada.')
    } else {
      await addZone(payload)
      setFeedback('Zona agregada a la cobertura.')
    }
    resetForm()
  }

  const copyLink = async () => {
    const url = `${window.location.origin}/`
    await navigator.clipboard?.writeText(url)
    setCopied('domicilio')
    window.setTimeout(() => setCopied(null), 1500)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Logística por ubicación"
        title="COBERTURA DE DOMICILIO"
        description="El domiciliario propio se asigna por barrio, no por horario. Si el GPS del cliente cae fuera de estas zonas, el pedido se enruta automáticamente a Rappi o DiDi Food."
        actions={
          <Badge variant="outline">
            <Radio className="h-3 w-3" />
            {clock.label} Bogotá
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Zonas activas"
          value={activeZones.length}
          hint={`${zones.length} configuradas`}
          icon={MapPin}
          tone={activeZones.length > 0 ? 'green' : 'red'}
        />
        <StatCard
          label="Cobertura"
          value={activeZones.length > 0 ? 'Propia' : 'Externa'}
          hint={activeZones.map((zone) => zone.name).join(', ') || 'Sin zonas'}
          icon={Truck}
          tone="brand"
        />
        <StatCard
          label="Agregador por defecto"
          value={channelLabel(defaultChannel)}
          hint="Fuera de cobertura"
          icon={Bike}
          tone="blue"
        />
        <StatCard
          label="Tarifa domicilio"
          value={formatCOP(deliveryFee)}
          hint="Solo pedidos a domicilio"
          icon={Store}
          tone="ink"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard title={`Zonas de cobertura · ${zones.length}`} className="xl:col-span-2">
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`rounded-xl border p-3 ${
                  zone.is_active
                    ? 'border-ink-200 bg-white'
                    : 'border-dashed border-ink-200 bg-ink-50 opacity-70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-brand-100 p-1.5 text-brand-700">
                      <MapPin className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-ink-900">{zone.name}</p>
                      <p className="text-[10px] uppercase tracking-wide text-ink-400">
                        {zone.radius_m > 0
                          ? `Radio ${zone.radius_m} m`
                          : 'Coincidencia por nombre'}{' '}
                        · {(zone.aliases ?? []).length} alias
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {zone.handling === 'front' && <Badge variant="warning">Enfrente</Badge>}
                    <Badge variant={zone.is_active ? 'success' : 'neutral'}>
                      {zone.is_active ? 'Activa' : 'Pausada'}
                    </Badge>
                    <Button
                      size="sm"
                      variant={zone.is_active ? 'outline' : 'secondary'}
                      onClick={() => void toggleZone(zone.id)}
                    >
                      {zone.is_active ? 'Pausar' : 'Activar'}
                    </Button>
                    <button
                      onClick={() => startEdit(zone)}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-900"
                      aria-label={`Editar ${zone.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => void removeZone(zone.id)}
                      className="rounded-lg p-1.5 text-ink-300 hover:bg-accent-50 hover:text-accent-600"
                      aria-label={`Eliminar ${zone.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {(zone.aliases ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {zone.aliases.map((alias) => (
                      <span
                        key={alias}
                        className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-500"
                      >
                        {alias}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {zones.length === 0 && (
              <p className="py-8 text-center text-xs text-ink-400">
                Sin zonas. Todos los domicilios se enrutarán al agregador externo.
              </p>
            )}
          </div>

          <div className="mt-3 rounded-xl bg-ink-50 p-3 text-[11px] text-ink-500">
            La validación usa el barrio detectado por el GPS (reverse geocoding) y, si hay
            coordenadas configuradas, la distancia al centro de la zona. Basta con que
            coincida una de las dos.
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title={editingId ? 'Editar zona' : 'Agregar zona'}>
            <div className="space-y-2">
              <Field label="Barrio / conjunto">
                <Input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  placeholder="Ej: El Ensueño"
                />
              </Field>
              <Field label="Alias separados por coma">
                <Input
                  value={form.aliases}
                  onChange={(event) => setForm({ ...form, aliases: event.target.value })}
                  placeholder="El Ensueño, Ensueño"
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Latitud centro">
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.center_lat}
                    onChange={(event) => setForm({ ...form, center_lat: event.target.value })}
                    placeholder="4.6155"
                  />
                </Field>
                <Field label="Longitud centro">
                  <Input
                    type="number"
                    step="0.0001"
                    value={form.center_lng}
                    onChange={(event) => setForm({ ...form, center_lng: event.target.value })}
                    placeholder="-74.1900"
                  />
                </Field>
              </div>
              <Field label="Radio (metros)" hint="0 = validar solo por nombre del barrio.">
                <Input
                  type="number"
                  value={form.radius_m}
                  onChange={(event) => setForm({ ...form, radius_m: event.target.value })}
                />
              </Field>
              <Field label="Tipo de entrega" hint="Enfrente = no se asigna a domiciliario externo.">
                <Select
                  value={form.handling}
                  onChange={(event) =>
                    setForm({ ...form, handling: event.target.value as 'own' | 'front' })
                  }
                >
                  <option value="own">Domiciliario propio</option>
                  <option value="front">Enfrente (aviso al equipo)</option>
                </Select>
              </Field>
              {feedback && (
                <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-[11px] text-emerald-700">
                  {feedback}
                </p>
              )}
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void submit()}>
                  <Plus className="h-4 w-4" />
                  {editingId ? 'Guardar cambios' : 'Agregar zona'}
                </Button>
                {editingId && (
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Reglas y enlaces QR">
            <div className="space-y-2">
              <Field label="Agregador fuera de cobertura">
                <Select
                  value={defaultChannel}
                  onChange={(event) =>
                    void setDefaultChannel(event.target.value as DeliveryChannel)
                  }
                >
                  <option value="rappi">Rappi</option>
                  <option value="didi">DiDi Food</option>
                  <option value="own">Propio (no recomendado)</option>
                </Select>
              </Field>
              <Field label="Tarifa de domicilio (COP)">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={fee}
                    onChange={(event) => setFee(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const value = Number(fee)
                      if (Number.isFinite(value) && value >= 0) void setDeliveryFee(value)
                    }}
                  >
                    Guardar
                  </Button>
                </div>
              </Field>

              <div className="border-t border-ink-100 pt-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink-400">
                  Enlaces para los QR
                </p>
                <button
                  onClick={() => void copyLink()}
                  className="mt-1.5 flex w-full items-center justify-between rounded-lg bg-ink-50 px-2.5 py-2 text-[11px] font-semibold text-ink-700 hover:bg-ink-100"
                >
                  <span>/?canal=domicilio · Domicilio</span>
                  <Copy className="h-3.5 w-3.5" />
                </button>
                {copied && (
                  <p className="mt-1.5 text-[10px] font-semibold text-emerald-600">
                    Enlace copiado · {copied}
                  </p>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
