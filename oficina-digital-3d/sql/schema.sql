-- Esquema de referencia para Oficina Digital 3D (Supabase / PostgreSQL).
-- Es idempotente: se puede ejecutar varias veces. Si tu proyecto ya tiene la
-- tabla creada, no hace falta correrlo.

create table if not exists public.agent_states (
  agent_id    text primary key,
  status      text not null default 'idle'
              check (status in ('idle','thinking','working','done','error')),
  screen_text text not null default 'Esperando instrucciones...',
  updated_at  timestamptz not null default now()
);

-- Agentes iniciales
insert into public.agent_states (agent_id) values
  ('planificador'), ('arquitecto'), ('constructor'), ('auditor')
on conflict (agent_id) do nothing;

-- Seguridad: el navegador solo puede LEER. Las escrituras las hace el backend
-- (n8n) con una credencial privada, que se salta RLS. No abras escritura anónima.
alter table public.agent_states enable row level security;

drop policy if exists "lectura publica agent_states" on public.agent_states;
create policy "lectura publica agent_states"
  on public.agent_states for select
  to anon, authenticated
  using (true);

-- Realtime para la tabla (ignora el error si ya estaba agregada)
alter publication supabase_realtime add table public.agent_states;

-- Mantiene updated_at al día
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists agent_states_updated_at on public.agent_states;
create trigger agent_states_updated_at
  before update on public.agent_states
  for each row execute function public.set_updated_at();
