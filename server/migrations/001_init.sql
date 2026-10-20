-- AccessQR · esquema inicial

create extension if not exists unaccent;

create type user_role         as enum ('admin', 'control_acceso', 'empleado');
create type employee_status   as enum ('activo', 'inactivo');
create type credential_status as enum ('vigente', 'inactiva', 'por_revisar');
create type movement_type     as enum ('entrada', 'salida');
create type access_result     as enum ('autorizado', 'denegado');

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table areas (
  id   serial primary key,
  name text not null unique
);

create table access_points (
  id   serial primary key,
  name text not null unique
);

create sequence employee_code_seq start 1000;

create table employees (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  full_name      text not null,
  document       text not null unique,
  position       text not null,
  area_id        integer not null references areas (id),
  status         employee_status not null default 'activo',
  last_access_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint employees_code_format     check (code ~ '^[A-Z0-9-]{3,20}$'),
  constraint employees_document_format check (document ~ '^[0-9]{5,15}$')
);
create index employees_area_idx   on employees (area_id);
create index employees_status_idx on employees (status);
create trigger employees_updated_at before update on employees
  for each row execute function set_updated_at();

-- Una credencial por empleado. Al subir token_version se invalidan todos los QR anteriores.
create table credentials (
  employee_id   uuid primary key references employees (id) on delete cascade,
  status        credential_status not null default 'vigente',
  token_version integer not null default 1,
  issued_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger credentials_updated_at before update on credentials
  for each row execute function set_updated_at();

create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  password_hash text not null,
  full_name     text not null,
  role          user_role not null,
  employee_id   uuid references employees (id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  constraint users_empleado_requires_employee check (role <> 'empleado' or employee_id is not null)
);
create unique index users_email_key    on users (lower(email));
create unique index users_employee_key on users (employee_id) where employee_id is not null;

-- Sesiones en base de datos: se pueden revocar. Solo se guarda el hash del token.
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  token_hash bytea not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx    on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

-- Registro de auditoría. No se borra con el empleado (sin ON DELETE CASCADE).
create table access_logs (
  id              bigserial primary key,
  employee_id     uuid not null references employees (id),
  movement        movement_type not null,
  result          access_result not null,
  reason          text,
  access_point_id integer not null references access_points (id),
  scanned_by      uuid references users (id) on delete set null,
  occurred_at     timestamptz not null default now(),
  constraint access_logs_reason_when_denied check (result = 'autorizado' or reason is not null)
);
create index access_logs_occurred_idx on access_logs (occurred_at desc, id desc);
create index access_logs_employee_idx on access_logs (employee_id, occurred_at desc);
create index access_logs_result_idx   on access_logs (result, occurred_at desc);

insert into access_points (name) values ('Portería principal'), ('Acceso administrativo');
