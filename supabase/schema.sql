-- ============================================================
-- SIEL App — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- profiles
-- One row per authenticated user. Created on first onboarding.
-- ============================================================
create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null default '',
  halachic_profile text not null default 'sephardi'
                  check (halachic_profile in ('sephardi', 'ashkenazi')),
  biometric_enabled boolean not null default false,
  location_enabled  boolean not null default true,
  is_pregnant      boolean not null default false,
  pregnancy_lmp    date,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- For existing deployments — adds the pregnancy columns if they don't exist yet:
alter table public.profiles
  add column if not exists is_pregnant boolean not null default false,
  add column if not exists pregnancy_lmp date;

-- ============================================================
-- cycles
-- Each row = one logged cycle start.
-- ============================================================
create table if not exists public.cycles (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  start_date      date not null,
  hebrew_date     text not null default '',
  onah            text not null default 'day'
                  check (onah in ('day', 'night')),
  created_at      timestamptz not null default now()
);

-- ============================================================
-- veset_dates
-- Calculated expected dates derived from each cycle.
-- ============================================================
create table if not exists public.veset_dates (
  id              uuid primary key default uuid_generate_v4(),
  cycle_id        uuid not null references public.cycles(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  date            date not null,
  type            text not null
                  check (type in ('onah_beinonit', 'veset_hachodesh', 'veset_haflagah', 'or_zarua')),
  onah            text not null check (onah in ('day', 'night')),
  is_fixed        boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- rabbis
-- Seeded manually by admins. Not editable by users.
-- ============================================================
create table if not exists public.rabbis (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  specialty       text not null check (specialty in ('sephardi', 'ashkenazi')),
  is_available    boolean not null default true,
  avatar_url      text,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- conversations
-- Each user↔rabbi pair has one conversation.
-- ============================================================
create table if not exists public.conversations (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  rabbi_id        uuid not null references public.rabbis(id),
  created_at      timestamptz not null default now(),
  unique (user_id, rabbi_id)
);

-- ============================================================
-- chat_messages
-- Messages within a conversation. Images stored in Storage.
-- ============================================================
create table if not exists public.chat_messages (
  id              uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null,   -- user_id or rabbi_id
  sender_type     text not null check (sender_type in ('user', 'rabbi')),
  content         text not null default '',
  image_path      text,            -- Storage path, not public URL
  is_encrypted    boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- service_providers
-- Nail / gel / beauty professionals. Seeded by admins.
-- ============================================================
create table if not exists public.service_providers (
  id              uuid primary key default uuid_generate_v4(),
  name            text not null,
  category        text not null check (category in ('nail', 'gel', 'beauty')),
  latitude        double precision not null,
  longitude       double precision not null,
  rating          numeric(3,2) not null default 5.0 check (rating between 1 and 5),
  phone           text not null default '',
  portfolio_paths text[] not null default '{}',  -- Storage paths
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

-- ============================================================
-- forum_posts
-- Anonymous community posts. handle is generated, not linked to user.
-- ============================================================
create table if not exists public.forum_posts (
  id               uuid primary key default uuid_generate_v4(),
  anonymous_handle text not null,
  title            text not null,
  content          text not null,
  category         text not null default 'כללי',
  reply_count      integer not null default 0,
  is_moderated     boolean not null default false,  -- true = hidden by mod
  created_at       timestamptz not null default now()
);

-- ============================================================
-- forum_replies
-- Replies to forum posts. Also anonymous.
-- ============================================================
create table if not exists public.forum_replies (
  id               uuid primary key default uuid_generate_v4(),
  post_id          uuid not null references public.forum_posts(id) on delete cascade,
  anonymous_handle text not null,
  content          text not null,
  is_moderated     boolean not null default false,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.cycles          enable row level security;
alter table public.veset_dates     enable row level security;
alter table public.conversations   enable row level security;
alter table public.chat_messages   enable row level security;
alter table public.rabbis          enable row level security;
alter table public.service_providers enable row level security;
alter table public.forum_posts     enable row level security;
alter table public.forum_replies   enable row level security;

-- profiles: users can only read/write their own row
create policy "profiles_self" on public.profiles
  for all using (auth.uid() = id);

-- cycles: own rows only
create policy "cycles_self" on public.cycles
  for all using (auth.uid() = user_id);

-- veset_dates: own rows only
create policy "veset_dates_self" on public.veset_dates
  for all using (auth.uid() = user_id);

-- conversations: user sees their own conversations
create policy "conversations_self" on public.conversations
  for all using (auth.uid() = user_id);

-- chat_messages: visible if you're the user in the conversation
create policy "chat_messages_self" on public.chat_messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

-- rabbis: read-only for all authenticated users
create policy "rabbis_read" on public.rabbis
  for select using (auth.role() = 'authenticated');

-- service_providers: read-only for all authenticated users
create policy "service_providers_read" on public.service_providers
  for select using (auth.role() = 'authenticated');

-- forum_posts: anyone authenticated can read non-moderated posts
create policy "forum_posts_read" on public.forum_posts
  for select using (auth.role() = 'authenticated' and is_moderated = false);

-- forum_posts: anyone authenticated can insert
create policy "forum_posts_insert" on public.forum_posts
  for insert with check (auth.role() = 'authenticated');

-- forum_replies: same as posts
create policy "forum_replies_read" on public.forum_replies
  for select using (auth.role() = 'authenticated' and is_moderated = false);

create policy "forum_replies_insert" on public.forum_replies
  for insert with check (auth.role() = 'authenticated');

-- ============================================================
-- Trigger: auto-create profile row on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Trigger: keep reply_count in sync
-- ============================================================
create or replace function public.increment_reply_count()
returns trigger language plpgsql as $$
begin
  update public.forum_posts
  set reply_count = reply_count + 1
  where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists on_reply_inserted on public.forum_replies;
create trigger on_reply_inserted
  after insert on public.forum_replies
  for each row execute procedure public.increment_reply_count();

-- ============================================================
-- Seed: demo rabbis
-- ============================================================
insert into public.rabbis (name, specialty, is_available) values
  ('הרב משה כהן',        'sephardi',  true),
  ('הרבנית שרה לוי',     'sephardi',  true),
  ('הרב אברהם גולדברג',  'ashkenazi', false),
  ('הרבנית מרים רוזנברג','ashkenazi', true)
on conflict do nothing;
