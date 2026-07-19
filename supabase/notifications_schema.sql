-- ============================================================
-- SIEL Notifications Schema
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- User push tokens (mobile users)
create table if not exists public.user_push_tokens (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now()
);
alter table public.user_push_tokens enable row level security;
create policy "user owns token" on public.user_push_tokens
  for all using (auth.uid() = user_id);

-- Rabbi push tokens (rabbis with mobile app)
create table if not exists public.rabbi_push_tokens (
  rabbi_id   uuid primary key references public.rabbis(id) on delete cascade,
  token      text not null,
  updated_at timestamptz not null default now()
);
-- No RLS needed — only updated via service role (Edge Function or backoffice)

-- Provider web push subscriptions (backoffice Web Push)
create table if not exists public.provider_web_push_subscriptions (
  provider_id  uuid primary key references public.service_providers(id) on delete cascade,
  subscription jsonb not null,
  updated_at   timestamptz not null default now()
);
-- No RLS — managed server-side only
