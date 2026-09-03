-- Execute no SQL Editor do projeto Supabase escolhido.
-- A senha do usuário pertence ao Supabase Auth e nunca deve aparecer neste arquivo.

create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

revoke all on table public.app_state from anon;
grant select, insert, update on table public.app_state to authenticated;

drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own"
on public.app_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own"
on public.app_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own"
on public.app_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

comment on table public.app_state is 'Estado pessoal do app, isolado por usuário via RLS.';
