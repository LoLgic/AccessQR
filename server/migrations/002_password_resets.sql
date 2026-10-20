-- Enlaces de recuperación de contraseña: de un solo uso y con vencimiento. Solo se guarda el hash del token.
create table password_resets (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  token_hash bytea not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index password_resets_user_idx on password_resets (user_id);
