-- DECOY installation schema.
-- Coordinates, IP addresses, emails, names, and device tokens are intentionally absent.

create extension if not exists pgcrypto;

create table public.participant_sessions (
  participant_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  terms_version text,
  terms_accepted_at timestamptz,
  location_verified_at timestamptz,
  submitted_at timestamptz,
  submission_id uuid unique
);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid unique not null references public.participant_sessions (participant_id),
  description text not null,
  status text not null,
  assigned_tablet_id text,
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  generation_started_at timestamptz,
  generated_at timestamptz,
  displayed_at timestamptz,
  image_path text,
  generation_attempts integer not null default 0,
  last_error_code text,
  created_at timestamptz not null default now(),
  constraint submissions_status_check
    check (status in ('queued', 'assigned', 'generating', 'ready', 'displayed', 'failed')),
  constraint submissions_description_length
    check (char_length(description) between 20 and 2000)
);

create table public.tablets (
  id text primary key,
  token_hash text not null,
  enabled boolean not null default true,
  last_seen_at timestamptz,
  last_displayed_at timestamptz,
  current_submission_id uuid references public.submissions (id),
  app_version text,
  created_at timestamptz not null default now()
);

alter table public.submissions
  add constraint submissions_assigned_tablet_fk
  foreign key (assigned_tablet_id) references public.tablets (id);

alter table public.participant_sessions
  add constraint participant_sessions_submission_fk
  foreign key (submission_id) references public.submissions (id);

create table public.queue_signals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

create table public.generation_control (
  id integer primary key check (id = 1),
  next_allowed_at timestamptz not null default now()
);

insert into public.generation_control (id, next_allowed_at)
values (1, now())
on conflict (id) do nothing;

create index submissions_status_created_at_idx
  on public.submissions (status, created_at);

create index submissions_assigned_tablet_idx
  on public.submissions (assigned_tablet_id);

create index tablets_last_displayed_idx
  on public.tablets (last_displayed_at);

-- ---------------------------------------------------------------------------
-- Row level security: visitors and tablets never read descriptions or hashes
-- through the Data API. All mutations go through Edge Functions (service role).
-- ---------------------------------------------------------------------------

alter table public.participant_sessions enable row level security;
alter table public.submissions enable row level security;
alter table public.tablets enable row level security;
alter table public.queue_signals enable row level security;
alter table public.generation_control enable row level security;

revoke all on table public.participant_sessions from anon, authenticated, public;
revoke all on table public.submissions from anon, authenticated, public;
revoke all on table public.tablets from anon, authenticated, public;
revoke all on table public.generation_control from anon, authenticated, public;
revoke all on table public.queue_signals from anon, authenticated, public;

-- Content-free realtime wake-ups only.
grant select on table public.queue_signals to anon, authenticated;

create policy queue_signals_select
  on public.queue_signals
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Atomic one-time submission
-- ---------------------------------------------------------------------------

create or replace function public.create_submission_once(
  p_participant_id uuid,
  p_description text,
  p_terms_version text,
  p_location_ttl_minutes integer,
  p_max_daily integer,
  p_min_length integer,
  p_max_length integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.participant_sessions%rowtype;
  v_id uuid;
  v_daily integer;
  v_desc text;
begin
  v_desc := btrim(p_description);

  perform pg_advisory_xact_lock(87, hashtext(p_participant_id::text));

  insert into public.participant_sessions (participant_id)
  values (p_participant_id)
  on conflict (participant_id) do nothing;

  select *
  into v_session
  from public.participant_sessions
  where participant_id = p_participant_id
  for update;

  if v_session.submitted_at is not null or v_session.submission_id is not null then
    raise exception 'ALREADY_SUBMITTED' using errcode = 'P0001';
  end if;

  if v_session.terms_accepted_at is null or v_session.terms_version is distinct from p_terms_version then
    raise exception 'TERMS_NOT_ACCEPTED' using errcode = 'P0001';
  end if;

  if v_session.location_verified_at is null then
    raise exception 'LOCATION_NOT_VERIFIED' using errcode = 'P0001';
  end if;

  if v_session.location_verified_at < now() - make_interval(mins => p_location_ttl_minutes) then
    raise exception 'LOCATION_EXPIRED' using errcode = 'P0001';
  end if;

  if char_length(v_desc) < p_min_length then
    raise exception 'DESCRIPTION_TOO_SHORT' using errcode = 'P0001';
  end if;

  if char_length(v_desc) > p_max_length then
    raise exception 'DESCRIPTION_TOO_LONG' using errcode = 'P0001';
  end if;

  select count(*)
  into v_daily
  from public.submissions
  where (created_at at time zone 'utc')::date = (now() at time zone 'utc')::date
    and status in ('queued', 'assigned', 'generating', 'ready', 'displayed');

  if v_daily >= p_max_daily then
    raise exception 'DAILY_CAPACITY_REACHED' using errcode = 'P0001';
  end if;

  insert into public.submissions (participant_id, description, status)
  values (p_participant_id, v_desc, 'queued')
  returning id into v_id;

  update public.participant_sessions
  set submitted_at = now(),
      submission_id = v_id
  where participant_id = p_participant_id;

  insert into public.queue_signals default values;

  return v_id;
exception
  when unique_violation then
    raise exception 'ALREADY_SUBMITTED' using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- Job claiming / lease recovery / generation slot
-- ---------------------------------------------------------------------------

create or replace function public.recover_stale_leases(
  p_max_generation_attempts integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.submissions
  set
    status = case
      when generation_attempts >= p_max_generation_attempts then 'failed'
      else 'queued'
    end,
    last_error_code = case
      when generation_attempts >= p_max_generation_attempts then coalesce(last_error_code, 'LEASE_EXPIRED')
      else last_error_code
    end,
    assigned_tablet_id = null,
    claimed_at = null,
    lease_expires_at = null
  where status in ('assigned', 'generating')
    and generated_at is null
    and lease_expires_at is not null
    and lease_expires_at < now();

  update public.submissions
  set
    assigned_tablet_id = null,
    claimed_at = null,
    lease_expires_at = null
  where status = 'ready'
    and lease_expires_at is not null
    and lease_expires_at < now();
end;
$$;

create or replace function public.select_eligible_tablet_id(
  p_online_threshold_seconds integer
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select t.id
  from public.tablets t
  where t.enabled = true
    and t.last_seen_at is not null
    and t.last_seen_at > now() - make_interval(secs => p_online_threshold_seconds)
    and not exists (
      select 1
      from public.submissions s
      where s.assigned_tablet_id = t.id
        and s.status in ('assigned', 'generating', 'ready')
        and (s.lease_expires_at is null or s.lease_expires_at > now())
    )
  order by
    (t.last_displayed_at is null) desc,
    t.last_displayed_at asc nulls first,
    t.id asc
  limit 1;
$$;

create or replace function public.claim_next_submission(
  p_tablet_id text,
  p_online_threshold_seconds integer,
  p_generation_lease_minutes integer,
  p_ready_display_lease_minutes integer,
  p_max_generation_attempts integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_eligible text;
  v_id uuid;
  v_path text;
begin
  perform public.recover_stale_leases(p_max_generation_attempts);

  perform 1
  from public.tablets
  where id = p_tablet_id
  for update;

  v_eligible := public.select_eligible_tablet_id(p_online_threshold_seconds);

  if v_eligible is null or v_eligible is distinct from p_tablet_id then
    return jsonb_build_object('action', 'none');
  end if;

  select s.id, s.image_path
  into v_id, v_path
  from public.submissions s
  where s.status = 'ready'
    and s.assigned_tablet_id is null
    and s.image_path is not null
  order by s.generated_at asc nulls last, s.created_at asc
  for update skip locked
  limit 1;

  if v_id is not null then
    update public.submissions
    set
      assigned_tablet_id = p_tablet_id,
      claimed_at = now(),
      lease_expires_at = now() + make_interval(mins => p_ready_display_lease_minutes)
    where id = v_id;

    return jsonb_build_object(
      'action', 'display',
      'submissionId', v_id,
      'imagePath', v_path
    );
  end if;

  select s.id
  into v_id
  from public.submissions s
  where s.status = 'queued'
  order by s.created_at asc
  for update skip locked
  limit 1;

  if v_id is null then
    return jsonb_build_object('action', 'none');
  end if;

  update public.submissions
  set
    status = 'assigned',
    assigned_tablet_id = p_tablet_id,
    claimed_at = now(),
    lease_expires_at = now() + make_interval(mins => p_generation_lease_minutes)
  where id = v_id;

  return jsonb_build_object(
    'action', 'generate',
    'submissionId', v_id
  );
end;
$$;

create or replace function public.try_acquire_generation_slot(
  p_interval_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next timestamptz;
  v_now timestamptz := now();
  v_retry integer;
begin
  insert into public.generation_control (id, next_allowed_at)
  values (1, v_now)
  on conflict (id) do nothing;

  select next_allowed_at
  into v_next
  from public.generation_control
  where id = 1
  for update;

  if v_next > v_now then
    v_retry := greatest(1, ceil(extract(epoch from (v_next - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'retryAfterSeconds', v_retry);
  end if;

  update public.generation_control
  set next_allowed_at = v_now + make_interval(secs => p_interval_seconds)
  where id = 1;

  return jsonb_build_object('allowed', true, 'retryAfterSeconds', 0);
end;
$$;

create or replace function public.begin_generation(
  p_tablet_id text,
  p_submission_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_description text;
begin
  update public.submissions
  set
    status = 'generating',
    generation_started_at = coalesce(generation_started_at, now()),
    generation_attempts = generation_attempts + case when status = 'assigned' then 1 else 0 end
  where id = p_submission_id
    and assigned_tablet_id = p_tablet_id
    and status in ('assigned', 'generating')
  returning description into v_description;

  if v_description is null then
    raise exception 'NOT_ASSIGNED' using errcode = 'P0001';
  end if;

  return v_description;
end;
$$;

create or replace function public.complete_generation(
  p_tablet_id text,
  p_submission_id uuid,
  p_image_path text,
  p_ready_display_lease_minutes integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.submissions
  set
    image_path = p_image_path,
    generated_at = now(),
    status = 'ready',
    last_error_code = null,
    lease_expires_at = now() + make_interval(mins => p_ready_display_lease_minutes)
  where id = p_submission_id
    and assigned_tablet_id = p_tablet_id
    and status = 'generating';

  if not found then
    raise exception 'NOT_ASSIGNED' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.fail_generation(
  p_tablet_id text,
  p_submission_id uuid,
  p_error_code text,
  p_max_generation_attempts integer,
  p_retryable boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  select generation_attempts
  into v_attempts
  from public.submissions
  where id = p_submission_id
    and assigned_tablet_id = p_tablet_id
  for update;

  if not found then
    raise exception 'NOT_ASSIGNED' using errcode = 'P0001';
  end if;

  if (not p_retryable) or v_attempts >= p_max_generation_attempts then
    update public.submissions
    set
      status = 'failed',
      last_error_code = p_error_code,
      assigned_tablet_id = null,
      claimed_at = null,
      lease_expires_at = null
    where id = p_submission_id;
  else
    update public.submissions
    set last_error_code = p_error_code
    where id = p_submission_id;
  end if;
end;
$$;

create or replace function public.mark_submission_displayed(
  p_tablet_id text,
  p_submission_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
  v_assigned text;
begin
  select status, assigned_tablet_id
  into v_status, v_assigned
  from public.submissions
  where id = p_submission_id
  for update;

  if not found then
    raise exception 'NOT_ASSIGNED' using errcode = 'P0001';
  end if;

  if v_status = 'displayed' and v_assigned = p_tablet_id then
    update public.tablets
    set
      current_submission_id = p_submission_id,
      last_displayed_at = coalesce(last_displayed_at, now())
    where id = p_tablet_id;
    return;
  end if;

  if v_assigned is distinct from p_tablet_id or v_status <> 'ready' then
    raise exception 'NOT_READY' using errcode = 'P0001';
  end if;

  update public.submissions
  set
    status = 'displayed',
    displayed_at = now(),
    lease_expires_at = null
  where id = p_submission_id;

  update public.tablets
  set
    current_submission_id = p_submission_id,
    last_displayed_at = now()
  where id = p_tablet_id;
end;
$$;

create or replace function public.record_location_verification(
  p_participant_id uuid,
  p_terms_version text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.participant_sessions (participant_id, terms_version, terms_accepted_at, location_verified_at)
  values (p_participant_id, p_terms_version, now(), now())
  on conflict (participant_id) do update
  set
    location_verified_at = now(),
    terms_version = excluded.terms_version,
    terms_accepted_at = case
      when public.participant_sessions.terms_version is distinct from excluded.terms_version
        or public.participant_sessions.terms_accepted_at is null
      then now()
      else public.participant_sessions.terms_accepted_at
    end;
end;
$$;

-- Execute privileges: service role / definer only. Not callable by visitors.
revoke all on function public.create_submission_once(uuid, text, text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.recover_stale_leases(integer) from public, anon, authenticated;
revoke all on function public.select_eligible_tablet_id(integer) from public, anon, authenticated;
revoke all on function public.claim_next_submission(text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.try_acquire_generation_slot(integer) from public, anon, authenticated;
revoke all on function public.begin_generation(text, uuid) from public, anon, authenticated;
revoke all on function public.complete_generation(text, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.fail_generation(text, uuid, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.mark_submission_displayed(text, uuid) from public, anon, authenticated;
revoke all on function public.record_location_verification(uuid, text) from public, anon, authenticated;

grant execute on function public.create_submission_once(uuid, text, text, integer, integer, integer, integer) to service_role;
grant execute on function public.recover_stale_leases(integer) to service_role;
grant execute on function public.select_eligible_tablet_id(integer) to service_role;
grant execute on function public.claim_next_submission(text, integer, integer, integer, integer) to service_role;
grant execute on function public.try_acquire_generation_slot(integer) to service_role;
grant execute on function public.begin_generation(text, uuid) to service_role;
grant execute on function public.complete_generation(text, uuid, text, integer) to service_role;
grant execute on function public.fail_generation(text, uuid, text, integer, boolean) to service_role;
grant execute on function public.mark_submission_displayed(text, uuid) to service_role;
grant execute on function public.record_location_verification(uuid, text) to service_role;

-- Private generated artwork storage. No public or authenticated policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-artworks',
  'generated-artworks',
  false,
  20971520,
  array['image/webp', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Realtime: content-free queue signals only.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'queue_signals'
  ) then
    execute 'alter publication supabase_realtime add table public.queue_signals';
  end if;
end;
$$;
