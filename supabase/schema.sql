-- ============================================================
-- Junta de Ruina · esquema Supabase (desarrollo)
-- ============================================================
-- AVISO: las políticas RLS de este archivo son deliberadamente abiertas para
-- que puedas prototipar sin auth. En producción NO dejes que "anon" lea
-- `es_deshonesto` ni `informacion_privada`: mueve esos campos a una tabla
-- privada y usa una Edge Function o el servidor con service_role.
--
-- Ejecuta este archivo en el SQL Editor de Supabase. Después configura:
--   VITE_SUPABASE_URL=...
--   VITE_SUPABASE_ANON_KEY=...
-- El WebSocket del servidor sigue siendo la autoridad de la partida; estas
-- tablas son el espejo que alimenta las suscripciones Realtime.

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Salas
-- ------------------------------------------------------------
create table if not exists public.salas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique check (codigo ~ '^[A-Z]{4}$'),
  fase text not null default 'LOBBY'
    check (fase in ('LOBBY', 'NOMINACION', 'VOTACION_COMISION', 'FIRMA_CONTRATO', 'RESOLUCION_RONDA', 'VICTORIA')),
  ronda smallint not null default 0 check (ronda between 0 and 3),
  puntos_honestos smallint not null default 0 check (puntos_honestos >= 0),
  puntos_deshonestos smallint not null default 0 check (puntos_deshonestos >= 0),
  indice_presidente smallint not null default 0,
  vocal_id uuid,
  intentos_rechazo smallint not null default 0 check (intentos_rechazo between 0 and 3),
  contrato jsonb,
  votos jsonb,
  ultimo_resultado jsonb,
  ganador text check (ganador in ('HONESTOS', 'DESHONESTOS')),
  estado jsonb not null default '{}'::jsonb,
  creada_en timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Jugadores
-- ------------------------------------------------------------
create table if not exists public.jugadores (
  id uuid primary key,
  sala_id uuid not null references public.salas(id) on delete cascade,
  nombre text not null check (char_length(nombre) between 2 and 20),
  piso text not null,
  es_deshonesto boolean not null default false,
  es_anfitrion boolean not null default false,
  conectado boolean not null default true,
  informacion_privada jsonb,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (sala_id, nombre),
  unique (sala_id, piso)
);

create index if not exists jugadores_sala_id_idx on public.jugadores (sala_id);
create index if not exists salas_codigo_idx on public.salas (codigo);

-- ------------------------------------------------------------
-- updated_at automático
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.actualizada_en = now();
  return new;
end;
$$;

drop trigger if exists salas_touch_updated_at on public.salas;
create trigger salas_touch_updated_at
before update on public.salas
for each row execute function public.touch_updated_at();

drop trigger if exists jugadores_touch_updated_at on public.jugadores;
create trigger jugadores_touch_updated_at
before update on public.jugadores
for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- RLS abierta SOLO para desarrollo
-- ------------------------------------------------------------
alter table public.salas enable row level security;
alter table public.jugadores enable row level security;

drop policy if exists "dev_salas_select" on public.salas;
drop policy if exists "dev_salas_insert" on public.salas;
drop policy if exists "dev_salas_update" on public.salas;
drop policy if exists "dev_salas_delete" on public.salas;

create policy "dev_salas_select" on public.salas
  for select to anon, authenticated using (true);
create policy "dev_salas_insert" on public.salas
  for insert to anon, authenticated with check (true);
create policy "dev_salas_update" on public.salas
  for update to anon, authenticated using (true) with check (true);
create policy "dev_salas_delete" on public.salas
  for delete to anon, authenticated using (true);

drop policy if exists "dev_jugadores_select" on public.jugadores;
drop policy if exists "dev_jugadores_insert" on public.jugadores;
drop policy if exists "dev_jugadores_update" on public.jugadores;
drop policy if exists "dev_jugadores_delete" on public.jugadores;

create policy "dev_jugadores_select" on public.jugadores
  for select to anon, authenticated using (true);
create policy "dev_jugadores_insert" on public.jugadores
  for insert to anon, authenticated with check (true);
create policy "dev_jugadores_update" on public.jugadores
  for update to anon, authenticated using (true) with check (true);
create policy "dev_jugadores_delete" on public.jugadores
  for delete to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.salas to anon, authenticated;
grant select, insert, update, delete on public.jugadores to anon, authenticated;

-- ------------------------------------------------------------
-- Realtime
-- ------------------------------------------------------------
alter table public.salas replica identity full;
alter table public.jugadores replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.salas;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.jugadores;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- Para comprobar que Realtime está activo:
--   select * from pg_publication_tables where pubname = 'supabase_realtime';
