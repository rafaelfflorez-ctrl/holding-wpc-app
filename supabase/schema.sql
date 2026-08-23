-- ============================================================
-- SETUP ÚNICO HOLDING WPC - Supabase (Postgres)
-- ============================================================
-- UN SOLO PEGADO que crea todo: tablas + RLS + datos por defecto
-- Y activa al primer usuario como ADMINISTRADOR.
--
-- ORDEN RECOMENDADO:
--   1) Crea el proyecto en Supabase.
--   2) Authentication -> Users -> Add user -> crea:
--        Email: logisticawpc@gmail.com  | Password: (tuya)
--   3) SQL Editor -> New query -> pega TODO este archivo -> Run.
--
-- Si ya creaste el usuario ANTES de ejecutar este script, Wendy queda
-- ADMINISTRADORA automáticamente. Si lo creaste DESPUÉS, basta con
-- ejecutar este mismo script otra vez (es 100% re-ejecutable).
--
-- El correo del admin se configura en la sección "PRIMER ADMIN" (más abajo).
-- ============================================================

-- ------------------------------------------------------------
-- TABLAS
-- ------------------------------------------------------------

-- Almacén genérico de colecciones de negocio (state de la app).
-- Cada "colección" (transactions, inventory, estimates, ...) se guarda
-- como un array JSON bajo su clave. Así el frontend sincroniza 1:1 su estado.
create table if not exists public.app_data (
  key text primary key,
  value jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Perfiles de usuario vinculados a Supabase Auth (auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null,
  role text not null default 'AUXILIAR_CONTABLE'
    check (role in ('ADMINISTRADOR','CONTADOR','AUXILIAR_CONTABLE')),
  title text,
  avatar text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SEED: colecciones iniciales vacías (o con umbrales por defecto)
-- ------------------------------------------------------------
insert into public.app_data (key, value) values
  ('users', '[]'::jsonb),
  ('transactions', '[]'::jsonb),
  ('inventory', '[]'::jsonb),
  ('inventoryHistory', '[]'::jsonb),
  ('purchaseOrders', '[]'::jsonb),
  ('estimates', '[]'::jsonb),
  ('serviceOrders', '[]'::jsonb),
  ('properties', '[]'::jsonb),
  ('programs', '[]'::jsonb),
  ('donations', '[]'::jsonb),
  ('thresholds', '[{"id":"TS-1","metricName":"flujoCaja","displayName":"Caja Minima Holding Requerida","operator":"LESS_THAN","value":1000000,"enabled":true},{"id":"TS-2","metricName":"margenUtilidad","displayName":"Margen Neto Holding Objetivo","operator":"LESS_THAN","value":22,"enabled":true}]'::jsonb),
  ('notifications', '[]'::jsonb)
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.app_data enable row level security;
alter table public.users enable row level security;

-- Cualquier usuario autenticado puede leer los datos de negocio
-- (es una herramienta interna del holding; el control real está en el login).
drop policy if exists "app_data_select_auth" on public.app_data;
create policy "app_data_select_auth" on public.app_data
  for select using (auth.role() = 'authenticated');

-- Escritura permitida EXCEPTO en la colección 'users' (la gestiona SOLO el
-- servidor con service role y validación de rol ADMIN - seguridad B2/C3).
drop policy if exists "app_data_insert_auth" on public.app_data;
create policy "app_data_insert_auth" on public.app_data
  for insert with check (auth.role() = 'authenticated' AND key <> 'users');

drop policy if exists "app_data_update_auth" on public.app_data;
create policy "app_data_update_auth" on public.app_data
  for update using (auth.role() = 'authenticated' AND key <> 'users')
  with check (key <> 'users');

drop policy if exists "app_data_delete_auth" on public.app_data;
create policy "app_data_delete_auth" on public.app_data
  for delete using (auth.role() = 'authenticated' AND key <> 'users');

-- Perfiles: cada usuario solo ve/edita su propio perfil.
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- Un ADMINISTRADOR puede gestionar los perfiles de todo el equipo.
-- Nota: la gestión de roles requiere elevar RLS (p.ej. una función SECURITY DEFINER).
create or replace function public.admin_manage_users()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  -- Sin sesión 'authenticated' real (SQL Editor, service_role, postgres o
  -- anónimo que ya fue bloqueado por RLS antes de llegar al trigger) -> permitir.
  if auth.role() is distinct from 'authenticated' then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  -- Usuario autenticado por el navegador: solo un ADMINISTRADOR gestiona perfiles.
  select (role = 'ADMINISTRADOR') into is_admin
  from public.users where id = auth.uid();
  if not coalesce(is_admin, false) then
    raise exception 'Solo un ADMINISTRADOR puede gestionar usuarios';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_admin_only on public.users;
create trigger trg_users_admin_only
  before insert or update or delete on public.users
  for each row execute function public.admin_manage_users();

-- ------------------------------------------------------------
-- TRIGGER: actualizar updated_at
-- ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_app_data_touch on public.app_data;
create trigger trg_app_data_touch
  before update on public.app_data
  for each row execute function public.touch_updated_at();

-- ============================================================
-- PRIMER ADMINISTRADOR (alto automático)
-- ============================================================
-- Edita estas 3 líneas si tu primer usuario tiene otro correo/nombre.
-- Si el usuario YA EXISTE en Authentication -> Users, se le asigna el rol
-- ADMINISTRADOR y su perfil se añade a app_data.users automáticamente.
-- Si NO existe aún, el script solo avisa; tras crearlo, vuelve a ejecutar
-- este mismo archivo (o solo este bloque) y quedará activado.
do $$
declare
  v_admin_email text := 'logisticawpc@gmail.com';
  v_admin_name  text := 'Wendy Colpas';
  v_admin_title text := 'Directora Administrativa del Holding';
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = v_admin_email;

  if v_uid is null then
    raise notice 'AVISO: El usuario % todavia no existe en Authentication -> Users. Crealo y vuelve a ejecutar este script para activarlo como ADMINISTRADOR.', v_admin_email;
  else
    -- 1) Perfil puente para RLS (public.users)
    insert into public.users (id, email, name, role, title)
    values (v_uid, v_admin_email, v_admin_name, 'ADMINISTRADOR', v_admin_title)
    on conflict (id) do update
      set role = 'ADMINISTRADOR', name = v_admin_name, title = v_admin_title;

    -- 2) Perfil que verá la app (app_data.users): se reemplaza cualquier
    --    entrada previa con ese correo y se añade la versión ADMIN.
    insert into public.app_data (key, value) values ('users', '[]'::jsonb)
    on conflict (key) do nothing;

    update public.app_data
    set value = coalesce(
      (select jsonb_agg(elem)
         from jsonb_array_elements(value) elem
        where elem->>'email' <> v_admin_email),
      '[]'::jsonb
    ) || jsonb_build_object(
      'id',        v_uid,
      'name',      v_admin_name,
      'email',     v_admin_email,
      'role',      'ADMINISTRADOR',
      'title',     v_admin_title,
      'avatar',    '',
      'lastLogin', 'Sin registros anteriores',
      'isActive',  true
    )
    where key = 'users';

    raise notice 'OK: % activada como ADMINISTRADORA.', v_admin_email;
  end if;
end $$;

-- ============================================================
-- CREAR EL RESTO DE USUARIOS
-- ============================================================
-- Con SUPABASE_SERVICE_ROLE_KEY configurada en el servidor, se crean desde
-- la app: Gestión de Roles -> Agregar Usuario (email + password + rol).
-- Sin esa clave, se crean igual que el primero:
--   1) Authentication -> Users -> Add user
--   2) Re-ejecutar este script, o insertar su perfil con:
--      insert into public.users (id, email, name, role, title)
--      select id, email, 'Nombre Apellido', 'CONTADOR', 'Contador'
--      from auth.users where email = 'correo@dominio.com'
--      on conflict (id) do update set role = 'CONTADOR';
--   3) Añadirlo a app_data.users (o simplemente re-ejecutar este script,
--      que NO toca a otros usuarios: solo re-afirma el ADMIN del bloque).
-- ============================================================
