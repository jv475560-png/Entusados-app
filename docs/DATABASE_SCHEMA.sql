-- ============================================================================
--  ENTUSADOS · DATABASE_SCHEMA.sql
--  PostgreSQL 15+ / Supabase
--  Dominios: ordering, delivery, inventory (BOM), suppliers, bre-b, accounting
--  Incluye: tablas, triggers de inventario, RLS, realtime y enrutamiento
--  de domicilios por horario (Parte 4).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
--  1. TIPOS
-- ============================================================================

do $$ begin
  create type public.user_role as enum ('customer', 'cashier', 'kitchen', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_category as enum (
    'elotes', 'espiropapas', 'hamburguesas', 'arepas', 'bebidas', 'adiciones'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending', 'preparing', 'ready', 'delivered', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  -- canal logístico del pedido
  create type public.order_channel as enum (
    'dine_in', 'pickup', 'local', 'own_delivery', 'front_delivery', 'rappi', 'didi'
  );
exception when duplicate_object then null; end $$;

-- Bases ya creadas: agrega el canal "enfrente" sin recrear el tipo.
do $$ begin
  alter type public.order_channel add value if not exists 'front_delivery';
exception when duplicate_object then null; end $$;

do $$ begin
  -- canal de reparto que se programa por horario (Parte 4)
  create type public.delivery_channel as enum ('own', 'rappi', 'didi');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum (
    'cash', 'bre_b', 'nequi', 'daviplata', 'bancolombia', 'card'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('pending', 'confirmed', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_provider as enum ('nequi', 'daviplata', 'bancolombia', 'bre_b');
exception when duplicate_object then null; end $$;

-- ============================================================================
--  2. TABLAS
-- ============================================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default 'Cliente',
  phone       text,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now()
);

create table if not exists public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  contact_name    text,
  phone           text,
  email           text,
  lead_time_days  integer not null default 1 check (lead_time_days >= 0),
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table if not exists public.ingredients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  unit            text not null default 'g',          -- g, ml, unit
  stock_qty       numeric(12, 3) not null default 0,
  min_stock       numeric(12, 3) not null default 0,
  cost_per_unit   numeric(12, 2) not null default 0,
  supplier_id     uuid references public.suppliers (id) on delete set null,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  category      public.product_category not null default 'elotes',
  price         numeric(12, 2) not null check (price >= 0),
  image_url     text,
  prep_minutes  integer not null default 8,
  is_active     boolean not null default true,
  is_featured   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- Bill of Materials: qué insumos consume cada plato
create table if not exists public.recipes_bom (
  product_id     uuid not null references public.products (id) on delete cascade,
  ingredient_id  uuid not null references public.ingredients (id) on delete restrict,
  qty            numeric(12, 3) not null check (qty > 0),
  primary key (product_id, ingredient_id)
);

-- Cobertura del domiciliario propio por barrio/zona (no por horario).
create table if not exists public.delivery_zones (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  aliases     text[] not null default '{}',
  center_lat  double precision,
  center_lng  double precision,
  radius_m    integer not null default 0 check (radius_m >= 0),
  handling    text not null default 'own' check (handling in ('own', 'front')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

alter table public.delivery_zones
  add column if not exists handling text not null default 'own';

-- Combos/promociones editables desde administración.
create table if not exists public.promotions (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text not null default '',
  price          numeric(12, 2) not null check (price >= 0),
  emoji          text not null default '🍔',
  image_url      text,
  badge          text not null default 'Combo',
  cta_label      text not null default 'Pedir ahora',
  only_at_store  boolean not null default false,
  is_active      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Compatibilidad con bases ya creadas sin la columna de imagen.
alter table public.promotions add column if not exists image_url text;

create table if not exists public.app_settings (
  key         text primary key,
  value       text not null,
  description text,
  updated_at  timestamptz not null default now()
);

create sequence if not exists public.order_code_seq start 1;

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  customer_id         uuid references public.profiles (id) on delete set null,
  session_token       uuid not null default gen_random_uuid(),   -- token QR anónimo
  customer_name       text not null default 'Cliente',
  customer_phone      text,
  channel             public.order_channel not null default 'pickup',
  status              public.order_status not null default 'pending',
  payment_method      public.payment_method not null default 'cash',
  payment_status      public.payment_status not null default 'pending',
  delivery_address       text,
  delivery_lat           double precision,
  delivery_lng           double precision,
  delivery_neighborhood  text,
  delivery_zone_id       uuid references public.delivery_zones (id) on delete set null,
  delivery_zone_name     text,
  subtotal               numeric(12, 2) not null default 0,
  delivery_fee           numeric(12, 2) not null default 0,
  total                  numeric(12, 2) not null default 0,
  notes                  text,
  channel_source         text not null default 'manual', -- coverage | front | manual | fallback
  created_at          timestamptz not null default now(),
  accepted_at         timestamptz,
  ready_at            timestamptz,
  delivered_at        timestamptz,
  updated_at          timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status, created_at);
create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_session_idx on public.orders (session_token);

create table if not exists public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  product_id    uuid references public.products (id) on delete set null,
  product_name  text not null,
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null default 1 check (quantity > 0),
  toppings      jsonb not null default '[]'::jsonb, -- [{ id, name, price, ingredient_id?, ingredient_qty? }]
  notes         text,
  line_total    numeric(12, 2) not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.supplier_orders (
  id            uuid primary key default gen_random_uuid(),
  supplier_id   uuid not null references public.suppliers (id) on delete restrict,
  status        text not null default 'draft'
                check (status in ('draft', 'sent', 'received', 'cancelled')),
  expected_at   date,
  total         numeric(12, 2) not null default 0,
  notes         text,
  created_at    timestamptz not null default now(),
  received_at   timestamptz
);

create table if not exists public.supplier_order_items (
  id                uuid primary key default gen_random_uuid(),
  supplier_order_id uuid not null references public.supplier_orders (id) on delete cascade,
  ingredient_id     uuid not null references public.ingredients (id) on delete restrict,
  qty               numeric(12, 3) not null check (qty > 0),
  unit_cost         numeric(12, 2) not null default 0
);

create table if not exists public.cash_closures (
  id              uuid primary key default gen_random_uuid(),
  opened_by       uuid references public.profiles (id) on delete set null,
  closed_by       uuid references public.profiles (id) on delete set null,
  opened_at       timestamptz not null default now(),
  closed_at       timestamptz,
  opening_cash    numeric(12, 2) not null default 0,
  closing_cash    numeric(12, 2),
  cash_income     numeric(12, 2) not null default 0,
  digital_income  numeric(12, 2) not null default 0,
  expenses_total  numeric(12, 2) not null default 0,
  expected_cash   numeric(12, 2) not null default 0,
  difference      numeric(12, 2),
  net_profit      numeric(12, 2) not null default 0,
  notes           text
);

create table if not exists public.expenses (
  id                uuid primary key default gen_random_uuid(),
  cash_closure_id   uuid not null references public.cash_closures (id) on delete cascade,
  concept           text not null,
  category          text not null default 'operativo',
  amount            numeric(12, 2) not null check (amount > 0),
  created_at        timestamptz not null default now()
);

create table if not exists public.payment_notifications (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid references public.orders (id) on delete set null,
  order_code     text,
  provider       public.payment_provider not null default 'bre_b',
  amount         numeric(12, 2) not null check (amount > 0),
  reference      text,
  sender_name    text,
  raw_payload    jsonb not null default '{}'::jsonb,
  status         public.payment_status not null default 'pending',
  received_at    timestamptz not null default now(),
  confirmed_at   timestamptz,
  confirmed_by   uuid references public.profiles (id) on delete set null
);

create index if not exists payment_notifications_order_idx
  on public.payment_notifications (order_id, status);

create table if not exists public.chat_messages (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  sender_role  text not null check (sender_role in ('customer', 'store', 'courier', 'system')),
  sender_name  text not null,
  body         text not null,
  created_at   timestamptz not null default now()
);

create index if not exists chat_messages_order_idx on public.chat_messages (order_id, created_at);

create table if not exists public.stock_alerts (
  id             uuid primary key default gen_random_uuid(),
  ingredient_id  uuid not null references public.ingredients (id) on delete cascade,
  stock_qty      numeric(12, 3) not null,
  min_stock      numeric(12, 3) not null,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz
);

create unique index if not exists stock_alerts_open_uidx
  on public.stock_alerts (ingredient_id) where resolved_at is null;

-- Checklist operativo de apertura / cierre de turno (Admin & POS)
create table if not exists public.shift_checklists (
  id            uuid primary key default gen_random_uuid(),
  shift_type    text not null check (shift_type in ('OPENING', 'CLOSING')),
  user_id       uuid references public.profiles (id) on delete set null,
  user_name     text not null default 'Staff',
  user_role     public.user_role,
  items_checked jsonb not null default '[]'::jsonb, -- ["battery", "fridges", ...]
  items_total   integer not null default 0,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists shift_checklists_created_idx
  on public.shift_checklists (created_at desc, shift_type);

-- ============================================================================
--  3. FUNCIONES DE APOYO (roles)
-- ============================================================================

create or replace function public.current_role()
returns public.user_role
language sql stable security definer set search_path = public, pg_temp
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(public.current_role() in ('cashier', 'kitchen', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

-- ============================================================================
--  4. RESOLUCIÓN DE CANAL DE DOMICILIO POR COBERTURA
--     Regla: si el barrio/coordenadas del cliente están dentro de una zona
--     activa, se asigna domiciliario propio. Fuera de cobertura se enruta
--     automáticamente al agregador externo configurado (Rappi/DiDi).
--     No depende de horarios.
-- ============================================================================

drop function if exists public.resolve_delivery_channel(double precision, double precision, text);
drop function if exists public.resolve_delivery_channel(double precision, double precision);
drop function if exists public.resolve_delivery_channel(timestamptz);

create or replace function public.resolve_delivery_channel(
  p_lat double precision default null,
  p_lng double precision default null,
  p_neighborhood text default null,
  p_address text default null
)
returns table (
  channel      public.delivery_channel,
  handling     text,
  zone_id      uuid,
  zone_name    text,
  is_fallback  boolean
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  v_fallback public.delivery_channel;
  rec        record;
  v_text     text := trim(coalesce(p_neighborhood, '') || ' ' || coalesce(p_address, ''));
begin
  -- 1) Coincidencia por nombre de barrio / dirección / alias.
  --    Las zonas "front" (enfrente) tienen prioridad sobre la cobertura general.
  if length(v_text) > 0 then
    select z.* into rec
    from public.delivery_zones z
    where z.is_active
      and exists (
        select 1
        from unnest(array[z.name] || z.aliases) as a(alias)
        where lower(v_text) like '%' || lower(a.alias) || '%'
           or lower(a.alias) like '%' || lower(v_text) || '%'
      )
    order by case when z.handling = 'front' then 0 else 1 end, length(z.name) desc
    limit 1;

    if found then
      return query select 'own'::public.delivery_channel, rec.handling, rec.id, rec.name, false;
      return;
    end if;
  end if;

  -- 2) Coincidencia por radio (haversine) si hay coordenadas.
  if p_lat is not null and p_lng is not null then
    select z.*,
           6371000 * 2 * asin(sqrt(
             power(sin(radians(z.center_lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(z.center_lat)) *
             power(sin(radians(z.center_lng - p_lng) / 2), 2)
           )) as distance_m
      into rec
    from public.delivery_zones z
    where z.is_active
      and z.center_lat is not null
      and z.center_lng is not null
      and z.radius_m > 0
      and 6371000 * 2 * asin(sqrt(
             power(sin(radians(z.center_lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(z.center_lat)) *
             power(sin(radians(z.center_lng - p_lng) / 2), 2)
          )) <= z.radius_m
    order by case when z.handling = 'front' then 0 else 1 end, distance_m asc
    limit 1;

    if found then
      return query select 'own'::public.delivery_channel, rec.handling, rec.id, rec.name, false;
      return;
    end if;
  end if;

  -- 3) Fuera de cobertura → agregador externo.
  select coalesce(nullif(value, '')::public.delivery_channel, 'rappi')
    into v_fallback
  from public.app_settings
  where key = 'default_external_channel';

  return query
    select coalesce(v_fallback, 'rappi'),
           'own'::text,
           null::uuid,
           null::text,
           true;
end;
$$;

-- ============================================================================
--  5. TRIGGERS
-- ============================================================================

-- 5.1 updated_at genérico
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_ingredients_touch on public.ingredients;
create trigger trg_ingredients_touch
  before update on public.ingredients
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_orders_touch on public.orders;
create trigger trg_orders_touch
  before update on public.orders
  for each row execute function public.fn_touch_updated_at();

-- 5.2 código y enrutamiento del pedido
create or replace function public.fn_order_before_insert()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_route   record;
  v_fee     numeric(12, 2);
begin
  if new.code is null or new.code = '' then
    new.code := 'ENT-' || to_char(now() at time zone 'America/Bogota', 'YYMMDD')
                || '-' || lpad(nextval('public.order_code_seq')::text, 4, '0');
  end if;

  -- Los pedidos de reparto SIEMPRE se resuelven por cobertura.
  if new.channel in ('own_delivery', 'front_delivery', 'rappi', 'didi') then
    select * into v_route
    from public.resolve_delivery_channel(
      new.delivery_lat,
      new.delivery_lng,
      new.delivery_neighborhood,
      new.delivery_address
    );

    if v_route.handling = 'front' then
      new.channel := 'front_delivery'::public.order_channel;
      new.channel_source := 'front';
    else
      new.channel := case when v_route.channel = 'own'
                          then 'own_delivery'::public.order_channel
                          else v_route.channel::text::public.order_channel end;
      new.channel_source := case when v_route.is_fallback then 'fallback' else 'coverage' end;
    end if;

    new.delivery_zone_id := v_route.zone_id;
    new.delivery_zone_name := v_route.zone_name;

    select coalesce(nullif(value, '')::numeric, 3500)
      into v_fee
    from public.app_settings where key = 'delivery_fee';
    new.delivery_fee := coalesce(nullif(new.delivery_fee, 0), v_fee, 3500);
  else
    -- local / pickup / dine_in no pagan domicilio
    new.delivery_fee := 0;
    new.delivery_zone_id := null;
    new.delivery_zone_name := null;
  end if;

  if new.status = 'preparing' and new.accepted_at is null then
    new.accepted_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_orders_before_insert on public.orders;
create trigger trg_orders_before_insert
  before insert on public.orders
  for each row execute function public.fn_order_before_insert();

-- 5.3 línea de pedido: total + descuento de inventario (BOM)
create or replace function public.fn_apply_recipe_stock(
  p_product_id uuid,
  p_quantity   integer,
  p_toppings   jsonb,
  p_multiplier integer,
  p_order_id   uuid,
  p_reason     text
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  rec record;
  top jsonb;
  v_qty numeric(12, 3);
begin
  if p_product_id is not null and p_quantity > 0 then
    for rec in
      select ingredient_id, qty from public.recipes_bom where product_id = p_product_id
    loop
      perform public.fn_adjust_stock(
        rec.ingredient_id,
        rec.qty * p_quantity * p_multiplier,
        p_order_id,
        p_reason
      );
    end loop;
  end if;

  -- Adiciones que también consumen insumo (ej: extra queso)
  if p_toppings is not null then
    for top in select * from jsonb_array_elements(p_toppings) loop
      if (top ? 'ingredient_id') and (top ? 'ingredient_qty') then
        v_qty := (top ->> 'ingredient_qty')::numeric * p_quantity * p_multiplier;
        perform public.fn_adjust_stock(
          (top ->> 'ingredient_id')::uuid, v_qty, p_order_id, p_reason
        );
      end if;
    end loop;
  end if;
end;
$$;

create or replace function public.fn_adjust_stock(
  p_ingredient_id uuid,
  p_delta         numeric,
  p_order_id      uuid,
  p_reason        text
)
returns void language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.ingredients
     set stock_qty = stock_qty + p_delta,
         updated_at = now()
   where id = p_ingredient_id;
end;
$$;

create or replace function public.fn_order_item_before()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
begin
  new.line_total := round(new.unit_price * new.quantity, 2);
  return new;
end;
$$;

drop trigger if exists trg_order_item_before on public.order_items;
create trigger trg_order_item_before
  before insert or update on public.order_items
  for each row execute function public.fn_order_item_before();

create or replace function public.fn_order_item_after_insert()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.fn_apply_recipe_stock(
    new.product_id, new.quantity, new.toppings, 1, new.order_id, 'sale'
  );
  return new;
end;
$$;

drop trigger if exists trg_order_item_after_insert on public.order_items;
create trigger trg_order_item_after_insert
  after insert on public.order_items
  for each row execute function public.fn_order_item_after_insert();

create or replace function public.fn_order_item_after_delete()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  perform public.fn_apply_recipe_stock(
    old.product_id, old.quantity, old.toppings, -1, old.order_id, 'void'
  );
  return old;
end;
$$;

drop trigger if exists trg_order_item_after_delete on public.order_items;
create trigger trg_order_item_after_delete
  after delete on public.order_items
  for each row execute function public.fn_order_item_after_delete();

create or replace function public.fn_order_item_after_update()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if old.product_id is distinct from new.product_id
     or old.quantity is distinct from new.quantity
     or old.toppings is distinct from new.toppings then
    perform public.fn_apply_recipe_stock(
      old.product_id, old.quantity, old.toppings, -1, old.order_id, 'void'
    );
    perform public.fn_apply_recipe_stock(
      new.product_id, new.quantity, new.toppings, 1, new.order_id, 'sale'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_order_item_after_update on public.order_items;
create trigger trg_order_item_after_update
  after update on public.order_items
  for each row execute function public.fn_order_item_after_update();

-- 5.4 totales del pedido a partir de sus líneas
create or replace function public.fn_recalc_order_totals()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_subtotal numeric(12, 2);
begin
  select coalesce(sum(line_total), 0) into v_subtotal
  from public.order_items where order_id = v_order_id;

  update public.orders
     set subtotal = v_subtotal,
         total = v_subtotal + delivery_fee
   where id = v_order_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_order_item_totals on public.order_items;
create trigger trg_order_item_totals
  after insert or update or delete on public.order_items
  for each row execute function public.fn_recalc_order_totals();

-- 5.5 alertas de stock crítico
create or replace function public.fn_check_stock_alert()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.stock_qty <= new.min_stock then
    insert into public.stock_alerts (ingredient_id, stock_qty, min_stock)
    values (new.id, new.stock_qty, new.min_stock)
    on conflict (ingredient_id) where resolved_at is null
    do update set stock_qty = excluded.stock_qty, min_stock = excluded.min_stock;
  else
    update public.stock_alerts
       set resolved_at = now()
     where ingredient_id = new.id and resolved_at is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ingredient_stock_alert on public.ingredients;
create trigger trg_ingredient_stock_alert
  after insert or update of stock_qty, min_stock on public.ingredients
  for each row execute function public.fn_check_stock_alert();

-- 5.6 notificación de pago: enlazar pedido por código/referencia
create or replace function public.fn_payment_notification_before()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.order_id is null and new.order_code is not null then
    select id into new.order_id from public.orders where code = new.order_code limit 1;
  end if;
  if new.order_id is null and new.reference is not null then
    select id into new.order_id from public.orders where code = new.reference limit 1;
  end if;
  if new.confirmed_at is not null and new.status = 'pending' then
    new.status := 'confirmed';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_payment_notification_before on public.payment_notifications;
create trigger trg_payment_notification_before
  before insert or update on public.payment_notifications
  for each row execute function public.fn_payment_notification_before();

-- 5.7 confirmar pago desde el panel (Bre-B / Nequi / banco)
create or replace function public.fn_confirm_payment(
  p_notification_id uuid,
  p_confirm boolean default true,
  p_reason text default null
)
returns public.payment_notifications
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_notif public.payment_notifications;
begin
  if not public.is_staff() then
    raise exception 'PERMISSION_DENIED' using errcode = '42501';
  end if;

  update public.payment_notifications
     set status = case when p_confirm then 'confirmed' else 'rejected' end,
         confirmed_at = now(),
         confirmed_by = auth.uid(),
         raw_payload = raw_payload || jsonb_build_object('reason', p_reason)
   where id = p_notification_id
   returning * into v_notif;

  if v_notif.order_id is not null then
    update public.orders
       set payment_status = case when p_confirm then 'confirmed' else 'rejected' end,
           updated_at = now()
     where id = v_notif.order_id;
  end if;

  return v_notif;
end;
$$;

-- 5.8 cierre de caja
create or replace function public.fn_cash_closure_compute()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cash numeric(12, 2);
  v_digital numeric(12, 2);
  v_expenses numeric(12, 2);
  v_end timestamptz := coalesce(new.closed_at, now());
begin
  select coalesce(sum(total), 0) into v_cash
  from public.orders
  where payment_status = 'confirmed'
    and payment_method = 'cash'
    and created_at >= new.opened_at and created_at <= v_end;

  select coalesce(sum(total), 0) into v_digital
  from public.orders
  where payment_status = 'confirmed'
    and payment_method <> 'cash'
    and created_at >= new.opened_at and created_at <= v_end;

  select coalesce(sum(amount), 0) into v_expenses
  from public.expenses where cash_closure_id = new.id;

  new.cash_income := v_cash;
  new.digital_income := v_digital;
  new.expenses_total := v_expenses;
  new.expected_cash := new.opening_cash + v_cash - v_expenses;
  new.net_profit := v_cash + v_digital - v_expenses;

  if new.closed_at is not null then
    new.difference := coalesce(new.closing_cash, 0) - new.expected_cash;
  else
    new.difference := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_cash_closure_compute on public.cash_closures;
create trigger trg_cash_closure_compute
  before insert or update on public.cash_closures
  for each row execute function public.fn_cash_closure_compute();

-- 5.8b recepción de orden de compra: suma stock de insumos
create or replace function public.fn_supplier_order_received()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  rec record;
begin
  if new.status = 'received' and (old.status is distinct from 'received') then
    for rec in
      select ingredient_id, qty
      from public.supplier_order_items
      where supplier_order_id = new.id
    loop
      update public.ingredients
         set stock_qty = stock_qty + rec.qty,
             updated_at = now()
       where id = rec.ingredient_id;
    end loop;
    new.received_at := coalesce(new.received_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_supplier_order_received on public.supplier_orders;
create trigger trg_supplier_order_received
  before update of status on public.supplier_orders
  for each row execute function public.fn_supplier_order_received();

-- 5.9 perfil automático al registrarse
create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Cliente'),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();

-- ============================================================================
--  6. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles              enable row level security;
alter table public.suppliers             enable row level security;
alter table public.ingredients           enable row level security;
alter table public.products              enable row level security;
alter table public.recipes_bom           enable row level security;
alter table public.delivery_zones        enable row level security;
alter table public.promotions            enable row level security;
alter table public.app_settings          enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.supplier_orders       enable row level security;
alter table public.supplier_order_items  enable row level security;
alter table public.cash_closures         enable row level security;
alter table public.expenses              enable row level security;
alter table public.payment_notifications enable row level security;
alter table public.chat_messages         enable row level security;
alter table public.stock_alerts          enable row level security;
alter table public.shift_checklists      enable row level security;

-- profiles
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- catálogo público
drop policy if exists products_public_read on public.products;
create policy products_public_read on public.products
  for select using (is_active or public.is_staff());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- cobertura de entrega: lectura pública, escritura admin
drop policy if exists delivery_zones_public_read on public.delivery_zones;
create policy delivery_zones_public_read on public.delivery_zones
  for select using (true);

drop policy if exists delivery_zones_admin_write on public.delivery_zones;
create policy delivery_zones_admin_write on public.delivery_zones
  for all using (public.is_admin()) with check (public.is_admin());

-- promociones visibles para todos; edición solo admin
drop policy if exists promotions_public_read on public.promotions;
create policy promotions_public_read on public.promotions
  for select using (is_active or public.is_staff());

drop policy if exists promotions_admin_write on public.promotions;
create policy promotions_admin_write on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

-- settings públicos de solo lectura (tarifas, canal por defecto)
drop policy if exists app_settings_public_read on public.app_settings;
create policy app_settings_public_read on public.app_settings
  for select using (true);

drop policy if exists app_settings_admin_write on public.app_settings;
create policy app_settings_admin_write on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- inventario y recetas: staff
drop policy if exists ingredients_staff_read on public.ingredients;
create policy ingredients_staff_read on public.ingredients
  for select using (public.is_staff());

drop policy if exists ingredients_admin_write on public.ingredients;
create policy ingredients_admin_write on public.ingredients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists recipes_staff_read on public.recipes_bom;
create policy recipes_staff_read on public.recipes_bom
  for select using (public.is_staff());

drop policy if exists recipes_admin_write on public.recipes_bom;
create policy recipes_admin_write on public.recipes_bom
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists suppliers_staff on public.suppliers;
create policy suppliers_staff on public.suppliers
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists supplier_orders_staff on public.supplier_orders;
create policy supplier_orders_staff on public.supplier_orders
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists supplier_order_items_staff on public.supplier_order_items;
create policy supplier_order_items_staff on public.supplier_order_items
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists stock_alerts_staff on public.stock_alerts;
create policy stock_alerts_staff on public.stock_alerts
  for all using (public.is_staff()) with check (public.is_staff());

-- checklists: todo el staff registra y consulta; solo admin borra
drop policy if exists shift_checklists_staff_read on public.shift_checklists;
create policy shift_checklists_staff_read on public.shift_checklists
  for select using (public.is_staff());

drop policy if exists shift_checklists_staff_insert on public.shift_checklists;
create policy shift_checklists_staff_insert on public.shift_checklists
  for insert with check (public.is_staff() and user_id = auth.uid());

drop policy if exists shift_checklists_admin_delete on public.shift_checklists;
create policy shift_checklists_admin_delete on public.shift_checklists
  for delete using (public.is_admin());

-- orders
drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read on public.orders
  for select using (customer_id = auth.uid() or public.is_staff());

drop policy if exists orders_customer_insert on public.orders;
create policy orders_customer_insert on public.orders
  for insert with check (customer_id = auth.uid() or public.is_staff());

drop policy if exists orders_staff_update on public.orders;
create policy orders_staff_update on public.orders
  for update using (public.is_staff() or customer_id = auth.uid())
  with check (public.is_staff() or customer_id = auth.uid());

drop policy if exists orders_admin_delete on public.orders;
create policy orders_admin_delete on public.orders
  for delete using (public.is_admin());

-- order_items
drop policy if exists order_items_read on public.order_items;
create policy order_items_read on public.order_items
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items
  for insert with check (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists order_items_update on public.order_items;
create policy order_items_update on public.order_items
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items
  for delete using (public.is_staff());

-- contabilidad
drop policy if exists cash_closures_staff on public.cash_closures;
create policy cash_closures_staff on public.cash_closures
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists expenses_staff on public.expenses;
create policy expenses_staff on public.expenses
  for all using (public.is_staff()) with check (public.is_staff());

-- notificaciones de pago: staff lee/actualiza; inserción solo service role
drop policy if exists payment_notifications_staff_read on public.payment_notifications;
create policy payment_notifications_staff_read on public.payment_notifications
  for select using (public.is_staff());

drop policy if exists payment_notifications_staff_update on public.payment_notifications;
create policy payment_notifications_staff_update on public.payment_notifications
  for update using (public.is_staff()) with check (public.is_staff());

-- el cliente ve el estado del pago de su propio pedido (tracking)
drop policy if exists payment_notifications_customer_read on public.payment_notifications;
create policy payment_notifications_customer_read on public.payment_notifications
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = payment_notifications.order_id and o.customer_id = auth.uid()
    )
  );

-- el simulador del panel inserta notificaciones de prueba (staff).
-- En producción el webhook usa service role y no requiere esta política.
drop policy if exists payment_notifications_staff_insert on public.payment_notifications;
create policy payment_notifications_staff_insert on public.payment_notifications
  for insert with check (public.is_staff());

-- chat: participantes del pedido y staff
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = chat_messages.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert with check (
    public.is_staff()
    or exists (
      select 1 from public.orders o
      where o.id = chat_messages.order_id and o.customer_id = auth.uid()
    )
  );

-- ============================================================================
--  7. REALTIME
-- ============================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'orders', 'order_items', 'payment_notifications', 'chat_messages',
    'stock_alerts', 'delivery_zones', 'promotions', 'cash_closures', 'ingredients',
    'shift_checklists'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ============================================================================
--  8. SEED (datos base)
-- ============================================================================

insert into public.app_settings (key, value, description) values
  ('delivery_fee', '3500', 'Tarifa fija de domicilio en COP'),
  ('default_external_channel', 'rappi', 'Agregador por defecto fuera de cobertura propia'),
  ('store_lat', '4.7110', 'Latitud de la tienda'),
  ('store_lng', '-74.0721', 'Longitud de la tienda'),
  ('store_name', 'ENTUSADOS', 'Nombre de la marca')
on conflict (key) do nothing;

-- Tarifa fija solicitada por el negocio.
update public.app_settings
   set value = '3500', updated_at = now()
 where key = 'delivery_fee';

insert into public.delivery_zones (id, name, aliases, center_lat, center_lng, radius_m, handling, is_active) values
  ('e0000000-0000-0000-0000-000000000005', 'Condominios del Ensueño 1', array['Condominios del Ensueño 1', 'Condominios Ensueño 1', 'Conjunto Ensueño 1', 'Enfrente'], 4.6157, -74.1903, 180, 'front', true),
  ('e0000000-0000-0000-0000-000000000001', 'El Ensueño',       array['El Ensueño', 'Ensueño', 'Barrio El Ensueño'], 4.6155, -74.1900, 1200, 'own', true),
  ('e0000000-0000-0000-0000-000000000002', 'Casa Grande',      array['Casa Grande', 'Casagrande'],                  4.6200, -74.1850, 1200, 'own', true),
  ('e0000000-0000-0000-0000-000000000003', 'María Elena',      array['María Elena', 'Maria Elena'],                 4.6100, -74.1800, 1200, 'own', true),
  ('e0000000-0000-0000-0000-000000000004', 'Conjunto Amarillo',array['Conjunto Amarillo', 'Amarillo'],              4.6250, -74.1950, 1000, 'own', true)
on conflict (id) do nothing;

insert into public.promotions (id, title, description, price, emoji, image_url, badge, cta_label, only_at_store, sort_order) values
  ('f0000000-0000-0000-0000-000000000001', 'Combo Parrandero', 'Hamburguesa crunch + espiropapa + bebida', 20000, '🍔', null, 'Combo estrella',    'Pedir ahora', false, 1),
  ('f0000000-0000-0000-0000-000000000002', 'Noche de Elotes',  '2 elotes de queso',                          23000, '🌽', null, 'Combo de la noche', 'Pedir ahora', false, 2),
  ('f0000000-0000-0000-0000-000000000003', 'Antojo Supremo',   'Espiropapa + elote de Doritos o Takis',     15000, '🌶️', null, 'Para compartir',    'Pedir ahora', false, 3)
on conflict (id) do nothing;

insert into public.suppliers (id, name, contact_name, phone, lead_time_days) values
  ('50000000-0000-0000-0000-000000000001', 'Carnes El Buen Corte', 'Andrés', '3001234567', 1),
  ('50000000-0000-0000-0000-000000000002', 'Verduras Plaza de Mercado', 'Lucía', '3007654321', 2)
on conflict (id) do nothing;

insert into public.ingredients (id, name, unit, stock_qty, min_stock, cost_per_unit, supplier_id) values
  ('a0000000-0000-0000-0000-000000000001', 'Pan brioche',              'unit', 60,  20,  1200, null),
  ('a0000000-0000-0000-0000-000000000002', 'Carne artesanal 1/4 lb',   'unit', 45,  15,  3200, '50000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'Queso doble crema',        'g',   1200, 400,  18,  null),
  ('a0000000-0000-0000-0000-000000000004', 'Papa a la francesa',       'g',   5000, 1500, 6,   '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000005', 'Elote tierno',             'unit', 80,  25,  1100, '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000006', 'Mantequilla',              'g',   900,  300,  14,  null),
  ('a0000000-0000-0000-0000-000000000007', 'Salsa de la casa',         'g',   1500, 500,  8,   null),
  ('a0000000-0000-0000-0000-000000000008', 'Maíz desgranado',          'g',   1800, 600,  7,   '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000009', 'Arepa',                    'unit', 70,  20,  800,  null),
  ('a0000000-0000-0000-0000-000000000010', 'Bebida personal',          'unit', 48,  12,  1800, null),
  ('a0000000-0000-0000-0000-000000000011', 'Aceite',                   'g',   4000, 1000, 5,   null),
  ('a0000000-0000-0000-0000-000000000012', 'Chorizo',                  'unit', 30,  10,  2100, '50000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000013', 'Lechuga',                  'g',   2000, 500,  5,   '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000014', 'Tomate',                   'g',   2000, 500,  6,   '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000015', 'Cebolla caramelizada',     'g',   1500, 400,  5,   '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000016', 'Tocineta',                 'g',   1200, 300,  22,  '50000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000017', 'Jalapeños',                'g',   800,  200,  18,  '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000018', 'Huevo',                    'unit', 40,  12,  500,  null),
  ('a0000000-0000-0000-0000-000000000019', 'Doritos',                  'g',   1500, 400,  12,  null),
  ('a0000000-0000-0000-0000-000000000020', 'Takis',                    'g',   1500, 400,  14,  null),
  ('a0000000-0000-0000-0000-000000000021', 'Mango',                    'g',   1500, 400,  10,  '50000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000022', 'Pollo desmechado',         'g',   2500, 600,  18,  '50000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.products (id, name, slug, description, category, price, image_url, prep_minutes, is_featured) values
  ('b0000000-0000-0000-0000-000000000001', 'Elote de Queso', 'elote-queso',      'Elote asado con queso campesino y salsa de la casa.', 'elotes', 12000, '/assets/elote-queso.jpg', 8, true),
  ('b0000000-0000-0000-0000-000000000002', 'Elote de Doritos', 'elote-doritos',    'Elote asado con Doritos triturados, un toque de tajín y salsa de la casa.', 'elotes', 12000, '/assets/elote-doritos.jpg', 8, true),
  ('b0000000-0000-0000-0000-000000000003', 'Elote de Takis', 'elote-takis',      'Elote asado con Takis y salsa de la casa.', 'elotes', 12000, '/assets/elote-takis.jpg', 8, false),
  ('b0000000-0000-0000-0000-000000000004', 'Elote de Mango', 'elote-mango',      'Elote asado con frutiño de mango, salsa de la casa y leche condensada.', 'elotes', 12000, '/assets/elote-mango.jpg', 8, false),
  ('b0000000-0000-0000-0000-000000000005', 'Hamburguesa Clásica',  'hamburguesa-clasica','Pan, carne tipo smash 1/4 de libra, queso doble crema, lechuga, tomate, cebolla en salsa y un toque de Doritos triturados.', 'hamburguesas', 13000, '/assets/hamburguesa-clasica.jpg', 10, true),
  ('b0000000-0000-0000-0000-000000000006', 'Hamburguesa Crunch',   'hamburguesa-crunch','Pan, carne tipo smash 1/4 de libra, tocineta crocante, queso doble crema, lechuga, tomate, cebolla en salsa y un toque de Doritos triturados.', 'hamburguesas', 15000, '/assets/hamburguesa-crunch.jpg?v=2', 10, true),
  ('b0000000-0000-0000-0000-000000000007', 'Jalapeño Crunch',      'jalapeno-crunch',  'Pan, carne tipo smash 1/4 de libra, tocineta crocante, jalapeños, queso doble crema, lechuga, tomate, cebolla en salsa y un toque de Doritos triturados.', 'hamburguesas', 16000, '/assets/jalapeno-crunch.jpg?v=2', 10, false),
  ('b0000000-0000-0000-0000-000000000008', 'Hamburguesa Criolla',  'hamburguesa-criolla','Pan, carne tipo smash 1/4 de libra, huevo frito, queso doble crema, lechuga, tomate, cebolla en salsa y un toque de Doritos triturados.', 'hamburguesas', 15000, '/assets/hamburguesa-criolla.jpg?v=2', 10, false),
  ('b0000000-0000-0000-0000-000000000009', 'Espiropapa', 'espiropapa', 'Espiral de papa crocante con salsa.', 'espiropapas', 4000, '/assets/espiropapas.jpg', 7, false),
  ('b0000000-0000-0000-0000-000000000010', 'Arepa de Queso',       'arepa-queso',      'Arepa asada rellena de queso fundido.', 'arepas', 6000, '/assets/arepa-queso.jpg?v=1', 6, false),
  ('b0000000-0000-0000-0000-000000000011', 'Arepa de Pollo',       'arepa-pollo',      'Arepa rellena de pollo y queso.', 'arepas', 10000, '/assets/arepa-pollo.jpg?v=1', 7, false),
  ('b0000000-0000-0000-0000-000000000012', 'Arepa Mixta',          'arepa-mixta',      'Arepa rellena de pollo, carne y queso.', 'arepas', 11000, '/assets/arepa-mixta.jpg?v=1', 8, false),
  ('b0000000-0000-0000-0000-000000000013', 'Arepa de Carne',       'arepa-carne',      'Arepa rellena de carne artesanal y queso.', 'arepas', 12000, '/assets/arepa-carne.jpg?v=2', 8, false),
  ('b0000000-0000-0000-0000-000000000014', 'Bebida personal',      'bebida-personal',  'Gaseosa o agua personal.', 'bebidas', 4000, '/assets/bebida-personal.jpg', 1, false)
on conflict (id) do nothing;

insert into public.recipes_bom (product_id, ingredient_id, qty) values
  -- Elotes
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 1),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 35),
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000007', 30),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000005', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000019', 30),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000007', 30),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 1),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000020', 30),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000007', 30),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000005', 1),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000021', 50),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', 30),
  -- Hamburguesas
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000013', 20),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000014', 30),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000015', 20),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000019', 20),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000007', 30),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 1),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 1),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000013', 20),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000014', 30),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000015', 20),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000019', 20),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000016', 25),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000007', 30),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 1),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 1),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000013', 20),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000014', 30),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000015', 20),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000019', 20),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000016', 25),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000017', 20),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000007', 30),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 1),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 1),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000013', 20),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000014', 30),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000015', 20),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000019', 20),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000018', 1),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000007', 30),
  -- Espiropapas
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 250),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000011', 20),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000007', 40),
  -- Arepas
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000009', 1),
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000003', 40),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000009', 1),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000022', 80),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000003', 20),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000007', 20),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000009', 1),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000022', 40),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000002', 0.5),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000007', 20),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000009', 1),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 1),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000003', 30),
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000007', 20),
  -- Bebida
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000010', 1)
on conflict (product_id, ingredient_id) do nothing;

-- ============================================================================
--  FIN DEL ESQUEMA
-- ============================================================================
