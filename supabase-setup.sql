-- ============================================================
-- Run this entire script in Supabase SQL Editor ONCE
-- before starting the app for the first time.
-- ============================================================

-- 1. Profiles table (mirrors auth.users, adds role)
create table if not exists profiles (
  id        uuid primary key references auth.users(id) on delete cascade,
  email     text not null,
  full_name text not null default '',
  role      text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz default now()
);

-- 2. Auto-create a profile row whenever a new auth user is created
--    Also reads 'role' from user metadata so invited admins get the right role.
create or replace function handle_new_user()
returns trigger as $$
begin
  begin
    insert into public.profiles (id, email, full_name, role)
    values (
      new.id,
      new.email,
      coalesce(new.raw_user_meta_data->>'full_name', ''),
      coalesce(new.raw_user_meta_data->>'role', 'user')
    )
    on conflict (id) do nothing;
  exception when others then
    raise warning 'handle_new_user: %', sqlerrm;
  end;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Row Level Security
alter table profiles enable row level security;

-- Authenticated users can read all profiles (needed for admin checks)
drop policy if exists "authenticated_read_profiles" on profiles;
create policy "authenticated_read_profiles"
  on profiles for select
  to authenticated
  using (true);

-- Users can update their own profile (name only — role is managed server-side)
drop policy if exists "user_update_own_profile" on profiles;
create policy "user_update_own_profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Service role bypasses RLS automatically (used by admin API routes)

-- ============================================================
-- 4. Invitations table — tracks who was invited and their status
-- ============================================================
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'user' check (role in ('admin', 'user')),
  status      text not null default 'pending' check (status in ('pending', 'accepted')),
  token       text unique,                     -- UUID token for accept-invitation link
  expires_at  timestamptz,                     -- link expires after 7 days
  accepted_at timestamptz,                     -- set when invitation is accepted
  invited_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

-- Migration: add new columns to existing invitations table
alter table public.invitations
  add column if not exists token       text unique,
  add column if not exists expires_at  timestamptz,
  add column if not exists accepted_at timestamptz;

-- Unique constraint so we can upsert by email
create unique index if not exists invitations_email_idx on invitations (email);

-- RLS: service role manages all; authenticated users can read (to show status)
alter table invitations enable row level security;

drop policy if exists "authenticated_read_invitations" on invitations;
create policy "authenticated_read_invitations"
  on invitations for select
  to authenticated
  using (true);
-- Insert / update handled exclusively by service role (admin API routes)

-- ============================================================
-- 5. Forms — add user_id column (safe to run on existing table)
-- ============================================================
alter table public.forms
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Index for fast per-user lookups
create index if not exists forms_user_id_idx on public.forms (user_id);

-- ============================================================
-- 6. Forms — add welcome_page JSONB column
-- ============================================================
-- Stores the optional welcome page config: logo, text, and T&C items.
-- Structure: { enabled, logo_url, logo_alt, text, terms_enabled, terms[] }
alter table public.forms
  add column if not exists welcome_page jsonb;
