create table if not exists public.workshop_registrations (
  id uuid primary key,
  request_fingerprint text not null,
  package text not null check (package in ('internationalPhysical', 'ukResidents', 'nigeriaOnline')),
  full_name text not null,
  email text not null,
  phone text not null,
  business text,
  grant_application jsonb,
  payment_status text not null default 'pending',
  registration_status text not null default 'pending_payment',
  created_at timestamptz not null default now()
);

alter table public.workshop_registrations enable row level security;
revoke all on table public.workshop_registrations from anon, authenticated;
