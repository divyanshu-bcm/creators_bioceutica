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

-- ============================================================
-- 7. Add paragraph field type to the field_type enum
-- ============================================================
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'paragraph';

-- ============================================================
-- 8. Add group, name_group, address_group field types to the enum
-- ============================================================
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'group';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'name_group';
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'address_group';

-- ============================================================
-- 9. Add boolean field type to the enum
-- ============================================================
ALTER TYPE field_type ADD VALUE IF NOT EXISTS 'boolean';

-- ============================================================
-- 10. Forms — add thank_you_page JSONB column
-- ============================================================
-- Stores the optional thank you page config: title and text.
-- Structure: { title, text }
alter table public.forms
  add column if not exists thank_you_page jsonb;

-- ============================================================
-- 11. Forms — add per-form webhook_url column
-- ============================================================
-- Optional endpoint that receives payloads when this specific form is submitted.
alter table public.forms
  add column if not exists webhook_url text;

-- ============================================================
-- 12. Forms — add per-form activity JSONB log
-- ============================================================
-- Stores an array of activity entries: [{ id, action, at, actor, details }]
alter table public.forms
  add column if not exists activity jsonb not null default '[]'::jsonb;

-- ============================================================
-- 13. Products table
-- ============================================================
create table if not exists public.products (
  product_id uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  sku text null,
  product_name text null,
  constraint products_pkey primary key (product_id)
);

-- ============================================================
-- 14. Forms — add linked products JSONB
-- ============================================================
-- Stores an array like:
-- [{ product_id, quantity, billing_type }] where billing_type is 'paid' | 'free'
alter table public.forms
  add column if not exists form_products jsonb not null default '[]'::jsonb;

-- ============================================================
-- 15. Creator Campaigns — per-deal lifecycle tracking
-- ============================================================
-- Each row represents one collab campaign between a standard creator
-- and the team. Created by n8n after a form is filled.
-- phase values: 'form_filled' | 'order_received' | 'content_published'
create table if not exists public.creator_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  prospect_id          uuid not null references public.prospects_standardcreators(prospect_id) on delete cascade,
  form_id              uuid references public.forms(id) on delete set null,
  form_submission_id   uuid references public.form_submissions(id) on delete set null,
  order_id             text null,
  phase                text not null default 'form_filled'
                         check (phase in ('form_filled', 'order_received', 'content_published')),
  form_filled_at       timestamptz default now(),
  order_received_at    timestamptz null,
  content_published_at timestamptz null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

create index if not exists creator_campaigns_prospect_id_idx on public.creator_campaigns(prospect_id);
create index if not exists creator_campaigns_form_submission_id_idx on public.creator_campaigns(form_submission_id);

-- RLS: authenticated users can read; only service-role (n8n / admin API) can write.
alter table public.creator_campaigns enable row level security;

create policy "authenticated users can read campaigns"
  on public.creator_campaigns for select
  using (auth.role() = 'authenticated');

create policy "service role full access to campaigns"
  on public.creator_campaigns for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- 16. Contracts — DocuSeal contract tracking
-- ============================================================
-- Tracks every contract sent via DocuSeal so we can display
-- status history in the dashboard.
create table if not exists public.contracts (
  id                     uuid primary key default gen_random_uuid(),
  docuseal_submission_id text not null unique,
  template_id            text not null,
  template_name          text not null,
  recipient_email        text not null,
  recipient_name         text null,
  document_name          text not null,
  status                 text not null default 'pending',
  sent_by                uuid references auth.users(id) on delete set null,
  metadata               jsonb not null default '{}'::jsonb,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

create index if not exists contracts_docuseal_submission_id_idx on public.contracts(docuseal_submission_id);
create index if not exists contracts_status_idx on public.contracts(status);
create index if not exists contracts_sent_by_idx on public.contracts(sent_by);

-- Migration: rename pandadoc_id -> docuseal_submission_id (only if you ran the older PandaDoc version)
-- Run this once if your contracts table already has the old column name:
--
--   alter table public.contracts rename column pandadoc_id to docuseal_submission_id;
--   alter index if exists contracts_pandadoc_id_idx rename to contracts_docuseal_submission_id_idx;
--   alter table public.contracts alter column status set default 'pending';

-- ============================================================
-- 17. Contracts — multi-party signing support
-- ============================================================
-- Tracks the logged-in sender's own role/slug so we can surface
-- an in-app "Sign Now" link, plus the full cast of submitters
-- (roles, emails, slugs, per-party status) for card rendering.
alter table public.contracts
  add column if not exists our_role       text,
  add column if not exists our_slug       text,
  add column if not exists our_embed_src  text,
  add column if not exists our_signed_at  timestamptz,
  add column if not exists submitters     jsonb not null default '[]'::jsonb;

create index if not exists contracts_our_slug_idx on public.contracts(our_slug);
