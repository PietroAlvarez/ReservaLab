-- ReservaLab: esquema privado, roles, RLS y auditoría.
-- Ejecutar en Supabase > SQL Editor con una cuenta administradora.

create extension if not exists pgcrypto;

create table if not exists public.suite_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'lector' check (role in ('admin', 'soporte', 'lector')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suite_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 3 and 160),
  category text not null check (category in ('Red', 'Correo', 'Sitio web', 'Reservas', 'Inventario', 'General')),
  priority text not null check (priority in ('alta', 'media', 'baja')),
  status text not null default 'pendiente' check (status in ('pendiente', 'en_progreso', 'completada')),
  due_date date not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suite_services (
  id text primary key,
  name text not null,
  description text not null default '',
  status text not null default 'operativo' check (status in ('operativo', 'atencion', 'incidente')),
  checked_at timestamptz,
  checked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suite_assets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(trim(code)) between 2 and 40),
  name text not null check (char_length(trim(name)) between 2 and 120),
  type text not null check (char_length(trim(type)) between 2 and 80),
  location text not null check (char_length(trim(location)) between 2 and 120),
  status text not null default 'disponible' check (status in ('disponible', 'asignado', 'mantencion', 'baja')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.suite_audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references auth.users(id),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.suite_is_support()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.suite_profiles
    where id = auth.uid() and role in ('admin', 'soporte')
  );
$$;

create or replace function public.suite_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.suite_profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.suite_touch_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.suite_write_audit_log()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.suite_audit_logs (table_name, record_id, operation, actor_id, old_data, new_data)
  values (
    tg_table_name,
    coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists suite_profiles_touch on public.suite_profiles;
create trigger suite_profiles_touch before update on public.suite_profiles for each row execute function public.suite_touch_updated_at();
drop trigger if exists suite_tasks_touch on public.suite_tasks;
create trigger suite_tasks_touch before update on public.suite_tasks for each row execute function public.suite_touch_updated_at();
drop trigger if exists suite_services_touch on public.suite_services;
create trigger suite_services_touch before update on public.suite_services for each row execute function public.suite_touch_updated_at();
drop trigger if exists suite_assets_touch on public.suite_assets;
create trigger suite_assets_touch before update on public.suite_assets for each row execute function public.suite_touch_updated_at();

drop trigger if exists suite_tasks_audit on public.suite_tasks;
create trigger suite_tasks_audit after insert or update or delete on public.suite_tasks for each row execute function public.suite_write_audit_log();
drop trigger if exists suite_services_audit on public.suite_services;
create trigger suite_services_audit after insert or update or delete on public.suite_services for each row execute function public.suite_write_audit_log();
drop trigger if exists suite_assets_audit on public.suite_assets;
create trigger suite_assets_audit after insert or update or delete on public.suite_assets for each row execute function public.suite_write_audit_log();

alter table public.suite_profiles enable row level security;
alter table public.suite_tasks enable row level security;
alter table public.suite_services enable row level security;
alter table public.suite_assets enable row level security;
alter table public.suite_audit_logs enable row level security;

drop policy if exists "profile_self_read" on public.suite_profiles;
create policy "profile_self_read" on public.suite_profiles for select to authenticated using (id = auth.uid() or public.suite_is_support());
drop policy if exists "admin_profiles_manage" on public.suite_profiles;
create policy "admin_profiles_manage" on public.suite_profiles for all to authenticated using (
  public.suite_is_admin()
) with check (
  public.suite_is_admin()
);

drop policy if exists "support_tasks_manage" on public.suite_tasks;
create policy "support_tasks_manage" on public.suite_tasks for all to authenticated using (public.suite_is_support()) with check (public.suite_is_support());
drop policy if exists "support_services_manage" on public.suite_services;
create policy "support_services_manage" on public.suite_services for all to authenticated using (public.suite_is_support()) with check (public.suite_is_support());
drop policy if exists "support_assets_manage" on public.suite_assets;
create policy "support_assets_manage" on public.suite_assets for all to authenticated using (public.suite_is_support()) with check (public.suite_is_support());
drop policy if exists "support_audit_read" on public.suite_audit_logs;
create policy "support_audit_read" on public.suite_audit_logs for select to authenticated using (public.suite_is_support());

revoke all on function public.suite_is_support() from public;
grant execute on function public.suite_is_support() to authenticated;
revoke all on function public.suite_is_admin() from public;
grant execute on function public.suite_is_admin() to authenticated;
revoke all on function public.suite_touch_updated_at() from public;
revoke all on function public.suite_write_audit_log() from public;

insert into public.suite_services (id, name, description, status)
values
  ('network', 'Red e Internet', 'Enlaces, Wi-Fi y conectividad interna', 'operativo'),
  ('mail', 'Correo institucional', 'Cuentas, accesos y entregabilidad', 'operativo'),
  ('website', 'Sitio web', 'Disponibilidad y contenido institucional', 'operativo'),
  ('reservations', 'Reservas', 'Equipos y laboratorio de computación', 'operativo')
on conflict (id) do nothing;

-- ÚLTIMO PASO: convierte tu usuario existente en administrador.
-- Reemplaza el correo antes de ejecutar esta sentencia por separado:
-- insert into public.suite_profiles (id, display_name, role)
-- select id, coalesce(raw_user_meta_data->>'name', email), 'admin'
-- from auth.users where email = 'TU_CORREO_DE_SOPORTE'
-- on conflict (id) do update set role = 'admin';
