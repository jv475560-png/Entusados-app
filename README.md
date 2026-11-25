# ENTUSADOS · Web App

Plataforma única (SPA con routing por permisos) para pedidos QR, POS presencial, KDS,
inventario con recetas (BOM), proveedores, pagos Bre-B y contabilidad. Sin n8n ni
orquestadores externos: todo con TypeScript, Supabase y PostgreSQL.

## Stack

- React 18 + TypeScript + Vite
- Tailwind CSS · dark gastronómico (`slate`, naranja `#F97316`, emerald `#10B981`)
- Supabase: Auth anónimo, Postgres, Realtime, Edge Functions
- Zustand para carrito, sesión y modo demo

Identidad visual: fondo slate-950/900, superficies `bg-slate-800/80`, bordes
redondeados amplios, primario naranja/rojo y acentos esmeralda para precios y pagos.
El logo y el arte del kit están en `public/assets/`.

## Arranque

```bash
npm install
cp .env.example .env.local   # opcional: sin variables corre en modo demo
npm run dev
```

Sin `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` la app funciona con datos locales
persistidos en el navegador (útil para revisar los 6 módulos). Con Supabase configurado,
los hooks leen y escriben en la base real.

```bash
npm run typecheck
npm run build
```

> En Supabase activa **Auth → Anonymous sign-ins** para clientes QR sin registro.
> Crea los usuarios staff (cajero, cocina, admin) y asigna su rol en `profiles`.
> El logo y el arte de marca ya están en `public/assets/` (`logo-entusados.jpeg` y
> `entusados-art.jpeg`); agrega las fotos de producto según
> [`public/assets/README.md`](public/assets/README.md).

## Base de datos

1. Crea el proyecto en Supabase.
2. Ejecuta [`docs/DATABASE_SCHEMA.sql`](docs/DATABASE_SCHEMA.sql) en el SQL Editor.
3. Despliega el webhook de pagos:

```bash
supabase functions deploy bre-b-webhook --no-verify-jwt
supabase secrets set BRE_B_WEBHOOK_SECRET=... 
```

El esquema incluye:

- Tablas: `products`, `ingredients`, `recipes_bom`, `orders`, `order_items`,
  `promotions`, `delivery_zones`, `cash_closures`, `payment_notifications`,
  `suppliers`, `supplier_orders`, `chat_messages`, `stock_alerts`, `expenses`,
  `app_settings`, `shift_checklists`.
- Triggers: descuento automático de inventario por receta, recálculo de totales,
  alertas de stock, confirmación de pagos, arqueo de caja y enrutamiento por cobertura.
- RLS por rol (`customer`, `cashier`, `kitchen`, `admin`) con helpers
  `current_role()`, `is_staff()` e `is_admin()`.
- Realtime en pedidos, ítems, pagos, chat, stock, zonas, promociones y cierres.

## Rutas

| Ruta | Rol | Descripción |
| --- | --- | --- |
| `/` | público | Tienda QR: promos, menú por secciones, carrito |
| `/cart` | público | Carrito y contexto QR (domicilio / local) |
| `/checkout` | público | Datos, GPS, cobertura, pago y pedido |
| `/order/:id` | público | Tracking, pago Bre-B y chat |
| `/admin` | admin (login por correo) | KPIs, promociones, inventario, proveedores, Bre-B, caja, checklists y cobertura |
| `/admin/pos` | cashier / admin | Toma de comandas y cobro |
| `/admin/kds` | kitchen / admin | Tablero con semáforo de tiempos |
| `/admin/promociones` | admin | CRUD de combos visibles en la tienda |
| `/admin/cobertura` | admin | Zonas con domiciliario propio y enlaces QR |
| `/admin/checklists` | admin | Apertura/cierre de turno e historial |

### QR de la tienda

- `/?canal=local` → **Estoy Entusado** (punto físico; el equipo pregunta mesa o para llevar).
- `/?canal=domicilio` → **Domicilio** (valida cobertura GPS contra los barrios configurados).
- El cliente no elige el modo: lo define el QR desde el que entra. Los enlaces se copian
  desde `Admin → Cobertura domicilio`.
- `Admin` pide correo y contraseña. En demo cualquier correo válido + contraseña de 4+
  caracteres entra como administrador; en Supabase se valida contra Auth y `profiles`.

## Checklists operativos (apertura / cierre)

Tabla `shift_checklists` (`shift_type` OPENING/CLOSING, `items_checked` jsonb,
`notes`, usuario, rol y fecha). Flujos:

- **Apertura (POS):** si no hay apertura registrada hoy, el POS muestra
  “Turno no iniciado” y bloquea el cobro. El modal exige 100% de la lista
  (baterías, neveras, freidoras, elotes, empaques, base de efectivo).
- **Cierre (Caja):** el checklist de limpieza/apagado debe estar al 100% para
  habilitar el botón de arqueo y cierre de caja.
- Cada registro guarda fecha/hora, nombre y rol. Historial en
  `Admin → Checklists turno`.

## Domicilios por cobertura (no por horario)

`delivery_zones` define los barrios con domiciliario propio: **El Ensueño, Casa Grande,
María Elena y Conjunto Amarillo** (seed editable). La función
`resolve_delivery_channel(lat, lng, neighborhood)` valida por nombre/alias y por radio
(haversine). Si el cliente está dentro, el pedido se asigna a `own_delivery`; si está
fuera, se enruta automáticamente a Rappi/DiDi (`default_external_channel`).

- El cliente ve la cobertura en el menú y el checkout usando el GPS + reverse geocoding.
- El trigger `fn_order_before_insert` **reescribe** el canal en el servidor: aunque se
  manipule el frontend, no se puede forzar reparto propio fuera de cobertura.
- `channel_source` queda como `coverage` o `fallback`; el tracking avisa el handoff.
- Admin → Cobertura domicilio permite agregar barrios, alias, centro, radio y pausar zonas.
  Ajusta las coordenadas del seed a la ubicación real de cada conjunto.

## Promociones editables

`promotions` alimenta el carrusel de la página principal. Desde
`Admin → Promociones` se crea, edita, pausa o elimina cada combo (título, descripción,
precio, emoji, etiqueta, CTA y “solo punto físico”). Al pulsar “Pedir ahora” el combo se
agrega directo al carrito; si está marcado como solo local y el QR es de domicilio, el
botón se bloquea.

## Geolocalización y Bre-B

- `useGeolocation` usa `navigator.geolocation` + reverse geocoding con Nominatim
  (OpenStreetMap, sin API key) y expone errores legibles.
- `useBreBVerifications` escucha `payment_notifications` por Realtime y confirma con la
  RPC `fn_confirm_payment`. En demo incluye un simulador en `Admin → Pagos Bre-B`.
- El webhook `supabase/functions/bre-b-webhook` recibe transferencias y las inserta con
  service role; nunca confirma el pago solo, siempre pasa por validación de caja.

## Estructura

```
src/
├── apps/        client · pos · kds · admin (login por correo)
├── modules/     ordering · delivery · inventory · suppliers
│                bre-b-verification · accounting · shift-checklist · pos-terminal
└── shared/      ui · services · types · lib · layouts
```

## Notas de operación

- El pago Bre-B/Nequi se muestra al número **3144358430**; actualízalo si cambia.
- Los teléfonos, precios y fotos del seed son de demostración.
- Para producción usa Supabase Auth (anónimo para clientes y correo para staff) y asigna
  el rol en `profiles`; el trigger `fn_handle_new_user` crea el perfil por defecto.
