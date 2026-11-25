# Cobertura de domicilio (sin horarios)

## Regla

El domiciliario propio se asigna **por ubicación**, no por franja horaria. Actualmente
cubre:

| Barrio / conjunto | Alias |
| --- | --- |
| El Ensueño | El Ensueño, Ensueño |
| Casa Grande | Casa Grande, Casagrande |
| María Elena | María Elena, Maria Elena |
| Conjunto Amarillo | Conjunto Amarillo, Amarillo |

Si el pedido cae fuera de estas zonas, se enruta automáticamente a **Rappi o DiDi Food**
(`app_settings.default_external_channel`). La tarifa de domicilio se mantiene.

> Las coordenadas del seed son aproximadas. Ajusta centro y radio de cada zona en
> `Admin → Cobertura domicilio` con la ubicación real del conjunto.

## Resolución

```sql
select * from public.resolve_delivery_channel(
  -74.19,   -- lng
  4.6155,   -- lat
  'El Ensueño, Bogotá'
);
-- channel | zone_id | zone_name | is_fallback
```

1. Busca coincidencia por nombre/alias con el barrio devuelto por el reverse geocoding.
2. Si no hay nombre, calcula distancia haversine al centro de cada zona con radio > 0.
3. Si nada coincide, devuelve el agregador externo con `is_fallback = true`.

## Bloqueo en servidor

`fn_order_before_insert` se ejecuta para `own_delivery`, `rappi` y `didi`:

- Reescribe `orders.channel` a `own_delivery` si hay cobertura, o al agregador externo.
- Guarda `delivery_zone_id`, `delivery_zone_name` y `channel_source`.
- Aplica la tarifa de domicilio.
- Si el pedido es `local`, `pickup` o `dine_in`, deja `delivery_fee = 0`.

Aunque el frontend envíe `own_delivery`, el servidor decide por GPS/barrio.

## Modos por QR

| QR | URL | Comportamiento |
| --- | --- | --- |
| Punto físico | `/?canal=local` | Etiqueta **Estoy Entusado**. Sin domicilio. El equipo pregunta mesa o para llevar. |
| Domicilio | `/?canal=domicilio` | Pide dirección/ GPS, valida cobertura y asigna canal. |

El cliente no puede cambiar el modo manualmente. Los enlaces se copian desde
`Admin → Cobertura domicilio`.

## UI

`useDeliveryRouting({ lat, lng, neighborhood })` devuelve:

```ts
{
  zones,
  route: { channel, zone_id, zone_name, is_fallback, status },
  coverageStatus, // inside | outside | unknown
  deliveryFee,
  defaultChannel,
  // CRUD admin
  toggleZone, updateZone, addZone, removeZone,
  setDefaultChannel, setDeliveryFee
}
```

- `DeliveryRouteBanner` muestra “Domicilio ENTUSADOS” dentro de cobertura y
  “Fuera de cobertura · Rappi/DiDi” fuera.
- El tracking conserva el handoff (`channel_source = 'fallback'`).
- No se usa horario en ninguna capa.
