-- Existing registrations require review before they are enabled for email.
alter table public.workshop_registrations
  add column if not exists email_enabled boolean not null default false,
  add column if not exists interest_email_sent_at timestamptz,
  add column if not exists group_email_sent_at timestamptz,
  add column if not exists email_claimed_at timestamptz,
  add column if not exists email_retry_after timestamptz;

-- New registrations are enabled automatically; existing rows remain disabled.
alter table public.workshop_registrations alter column email_enabled set default true;

create or replace function public.claim_workshop_email()
returns table (
  id uuid, full_name text, email text, package text, grant_application jsonb,
  email_kind text, claimed_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with candidate as (
    select r.id,
      case when r.interest_email_sent_at is null then 'interest' else 'group' end as kind
    from public.workshop_registrations r
    where r.email_enabled
      and (r.email_retry_after is null or r.email_retry_after <= now())
      and (r.email_claimed_at is null or r.email_claimed_at < now() - interval '10 minutes')
      and (r.interest_email_sent_at is null
        or (r.payment_status = 'paid' and r.group_email_sent_at is null))
    order by r.created_at, r.id
    for update skip locked
    limit 1
  ), claimed as (
    update public.workshop_registrations r
    set email_claimed_at = clock_timestamp()
    from candidate c
    where r.id = c.id
    returning r.id, r.full_name, r.email, r.package, r.grant_application,
      c.kind, r.email_claimed_at
  )
  select * from claimed;
$$;

create or replace function public.finish_workshop_email(
  p_id uuid, p_kind text, p_claimed_at timestamptz, p_sent boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind is null or p_kind not in ('interest', 'group') or p_sent is null then
    raise exception 'Invalid email completion';
  end if;
  update public.workshop_registrations
  set interest_email_sent_at = case when p_sent and p_kind = 'interest' then now() else interest_email_sent_at end,
      group_email_sent_at = case when p_sent and p_kind = 'group' then now() else group_email_sent_at end,
      email_claimed_at = null,
      email_retry_after = case when p_sent then null else now() + interval '30 minutes' end
  where id = p_id and email_claimed_at = p_claimed_at;
  return found;
end;
$$;

revoke all on function public.claim_workshop_email() from public, anon, authenticated;
revoke all on function public.finish_workshop_email(uuid, text, timestamptz, boolean) from public, anon, authenticated;
grant execute on function public.claim_workshop_email() to service_role;
grant execute on function public.finish_workshop_email(uuid, text, timestamptz, boolean) to service_role;
