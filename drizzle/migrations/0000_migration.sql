
create type public.app_role as enum ('student','admin','recruiter','org_leader');
create type public.entry_status as enum ('draft','pending','verified','rejected','flagged');
create type public.event_status as enum ('draft','published','cancelled');

-- roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  summary text not null default '',
  skills text[] not null default '{}',
  causes text[] not null default '{}',
  organization_name text not null default '',
  recruiter_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admin profile read" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "recruiter visible profiles" on public.profiles for select to authenticated
  using (recruiter_visible and public.has_role(auth.uid(),'recruiter'));
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- signup trigger: profile + role. Admin can only be self-assigned when no admin exists yet.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r text := coalesce(new.raw_user_meta_data->>'role','student');
  chosen public.app_role;
begin
  insert into public.profiles (id, full_name, organization_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          coalesce(new.raw_user_meta_data->>'organization_name',''));
  if r = 'admin' and not exists (select 1 from public.user_roles where role='admin') then
    chosen := 'admin';
  elsif r in ('recruiter','org_leader') then
    chosen := r::public.app_role;
  else
    chosen := 'student';
  end if;
  insert into public.user_roles (user_id, role) values (new.id, chosen);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text not null default '',
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update, delete on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own notif" on public.notifications for delete to authenticated using (user_id = auth.uid());

-- events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null default auth.uid(),
  organization text not null,
  title text not null check (char_length(title) between 1 and 150),
  description text not null default '' check (char_length(description) <= 4000),
  location text not null check (char_length(location) between 1 and 200),
  starts_at timestamptz not null,
  duration_hours numeric(5,2) not null default 2 check (duration_hours > 0 and duration_hours <= 24),
  capacity integer not null check (capacity > 0 and capacity <= 10000),
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "read published or own" on public.events for select to authenticated
  using (status = 'published' or leader_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "leaders create" on public.events for insert to authenticated
  with check (leader_id = auth.uid() and public.has_role(auth.uid(),'org_leader'));
create policy "leaders update own" on public.events for update to authenticated
  using (leader_id = auth.uid()) with check (leader_id = auth.uid());
create policy "leaders delete own drafts" on public.events for delete to authenticated
  using (leader_id = auth.uid() and status = 'draft');

-- registrations
create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  student_id uuid not null default auth.uid(),
  attended boolean not null default false,
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);
grant select, insert, update, delete on public.event_registrations to authenticated;
grant all on public.event_registrations to service_role;
alter table public.event_registrations enable row level security;

create or replace function public.is_event_leader(_event uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = _event and leader_id = _user)
$$;

create policy "student reads own reg" on public.event_registrations for select to authenticated
  using (student_id = auth.uid() or public.is_event_leader(event_id, auth.uid()));
create policy "student registers" on public.event_registrations for insert to authenticated
  with check (student_id = auth.uid() and public.has_role(auth.uid(),'student'));
create policy "student cancels" on public.event_registrations for delete to authenticated
  using (student_id = auth.uid() and attended = false);
create policy "leader marks attendance" on public.event_registrations for update to authenticated
  using (public.is_event_leader(event_id, auth.uid())) with check (public.is_event_leader(event_id, auth.uid()));

-- volunteer entries
create table public.volunteer_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null default auth.uid(),
  organization text not null check (char_length(organization) between 1 and 150),
  org_type text not null default 'Nonprofit',
  role text not null default '' check (char_length(role) <= 120),
  activity_date date not null,
  hours numeric(5,2) not null check (hours > 0 and hours <= 24),
  description text not null check (char_length(description) between 1 and 2000),
  evidence_path text,
  status public.entry_status not null default 'pending',
  review_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.volunteer_entries to authenticated;
grant all on public.volunteer_entries to service_role;
alter table public.volunteer_entries enable row level security;
create policy "student reads own" on public.volunteer_entries for select to authenticated using (student_id = auth.uid());
create policy "admin reads all" on public.volunteer_entries for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "recruiter reads verified of visible" on public.volunteer_entries for select to authenticated
  using (status = 'verified' and public.has_role(auth.uid(),'recruiter')
         and exists (select 1 from public.profiles p where p.id = student_id and p.recruiter_visible));
create policy "student inserts own" on public.volunteer_entries for insert to authenticated
  with check (student_id = auth.uid() and status in ('draft','pending') and public.has_role(auth.uid(),'student'));
create policy "student updates unverified" on public.volunteer_entries for update to authenticated
  using (student_id = auth.uid() and status <> 'verified') with check (student_id = auth.uid());
create policy "admin updates" on public.volunteer_entries for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (true);
create policy "student deletes unverified" on public.volunteer_entries for delete to authenticated
  using (student_id = auth.uid() and status <> 'verified');

-- verification log (append-only: no insert/update/delete policies for users)
create table public.verification_log (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null,
  student_id uuid not null,
  actor_id uuid,
  action text not null,
  reason text,
  created_at timestamptz not null default now()
);
grant select on public.verification_log to authenticated;
grant all on public.verification_log to service_role;
alter table public.verification_log enable row level security;
create policy "admin reads log" on public.verification_log for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "student reads own log" on public.verification_log for select to authenticated using (student_id = auth.uid());

-- entry rules
create or replace function public.entry_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare is_admin boolean := public.has_role(auth.uid(),'admin');
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if auth.uid() is not null and not is_admin then
      new.review_reason := null; new.reviewed_by := null; new.reviewed_at := null;
      if new.status not in ('draft','pending') then new.status := 'pending'; end if;
    end if;
    if new.activity_date > current_date then raise exception 'Activity date cannot be in the future'; end if;
    return new;
  end if;

  if auth.uid() = old.student_id and not (is_admin and new.status in ('verified','rejected','flagged') and auth.uid() <> old.student_id) then
    -- student edit / resubmit
    if old.status = 'verified' then raise exception 'Verified entries cannot be changed'; end if;
    if new.status not in ('draft','pending') then raise exception 'Students can only save drafts or submit for verification'; end if;
    if new.activity_date > current_date then raise exception 'Activity date cannot be in the future'; end if;
    new.student_id := old.student_id;
    new.event_id := old.event_id;
    if new.status = 'pending' and old.status <> 'pending' then
      insert into public.verification_log(entry_id, student_id, actor_id, action, reason)
      values (old.id, old.student_id, auth.uid(), case when old.status in ('rejected','flagged') then 'resubmitted' else 'submitted' end, null);
    end if;
    new.reviewed_by := old.reviewed_by; new.reviewed_at := old.reviewed_at;
    return new;
  end if;

  if is_admin then
    if new.status = old.status then return new; end if;
    if new.status not in ('verified','rejected','flagged') then raise exception 'Invalid review decision'; end if;
    if new.status in ('rejected','flagged') and coalesce(trim(new.review_reason),'') = '' then
      raise exception 'A written explanation is required to reject or flag an entry';
    end if;
    if new.status = 'verified' then new.review_reason := nullif(trim(coalesce(new.review_reason,'')),''); end if;
    -- admins may only change status/reason
    new.organization := old.organization; new.org_type := old.org_type; new.role := old.role;
    new.activity_date := old.activity_date; new.hours := old.hours; new.description := old.description;
    new.evidence_path := old.evidence_path; new.student_id := old.student_id; new.event_id := old.event_id;
    new.reviewed_by := auth.uid(); new.reviewed_at := now();
    insert into public.verification_log(entry_id, student_id, actor_id, action, reason)
    values (old.id, old.student_id, auth.uid(), new.status::text, new.review_reason);
    insert into public.notifications(user_id, title, body, link)
    values (old.student_id,
      case new.status when 'verified' then 'Hours verified' when 'rejected' then 'Entry rejected' else 'Entry flagged for follow-up' end,
      old.hours || ' hrs at ' || old.organization || coalesce(' — ' || new.review_reason, ''),
      '/hours');
    return new;
  end if;
  raise exception 'Not allowed';
end $$;
create trigger volunteer_entries_guard before insert or update on public.volunteer_entries
  for each row execute function public.entry_guard();

create or replace function public.entry_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending' then
    insert into public.verification_log(entry_id, student_id, actor_id, action) values (new.id, new.student_id, auth.uid(), 'submitted');
  elsif new.event_id is not null then
    insert into public.verification_log(entry_id, student_id, actor_id, action) values (new.id, new.student_id, auth.uid(), 'draft created from attendance');
  end if;
  return new;
end $$;
create trigger volunteer_entries_after_insert after insert on public.volunteer_entries
  for each row execute function public.entry_after_insert();

-- event rules
create or replace function public.event_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    if new.starts_at <= now() then raise exception 'Event must be scheduled in the future'; end if;
    return new;
  end if;
  new.leader_id := old.leader_id;
  if old.status = 'cancelled' and new.status <> 'cancelled' then raise exception 'Cancelled events cannot be reopened'; end if;
  if new.status = 'draft' and old.status = 'published' then raise exception 'Published events cannot return to draft; cancel instead'; end if;
  if new.capacity < (select count(*) from public.event_registrations where event_id = old.id) then
    raise exception 'Capacity cannot be lower than current registrations';
  end if;
  if new.starts_at <> old.starts_at and new.starts_at <= now() then raise exception 'Event must be scheduled in the future'; end if;
  if old.status = 'published' then
    if new.status = 'cancelled' then
      insert into public.notifications(user_id, title, body, link)
      select r.student_id, 'Event cancelled', old.title || ' on ' || to_char(old.starts_at,'Mon DD, YYYY') || ' has been cancelled.', '/events'
      from public.event_registrations r where r.event_id = old.id;
    elsif (new.title, new.starts_at, new.location, new.description, new.duration_hours) is distinct from
          (old.title, old.starts_at, old.location, old.description, old.duration_hours) then
      insert into public.notifications(user_id, title, body, link)
      select r.student_id, 'Event details changed', new.title || ' — ' || to_char(new.starts_at,'Mon DD, YYYY HH24:MI') || ' at ' || new.location, '/events'
      from public.event_registrations r where r.event_id = old.id;
    end if;
  end if;
  return new;
end $$;
create trigger events_guard before insert or update on public.events
  for each row execute function public.event_guard();

create or replace function public.registration_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare ev public.events;
begin
  if tg_op = 'INSERT' then
    select * into ev from public.events where id = new.event_id for update;
    if ev.id is null or ev.status <> 'published' then raise exception 'Event is not open for registration'; end if;
    if ev.starts_at <= now() then raise exception 'Event has already started'; end if;
    if (select count(*) from public.event_registrations where event_id = new.event_id) >= ev.capacity then
      raise exception 'This event is full';
    end if;
    new.attended := false;
    return new;
  end if;
  -- update: only attendance may change
  new.event_id := old.event_id; new.student_id := old.student_id; new.created_at := old.created_at;
  select * into ev from public.events where id = old.event_id;
  if new.attended and not old.attended then
    if ev.starts_at > now() then raise exception 'Attendance can only be marked after the event starts'; end if;
    if not exists (select 1 from public.volunteer_entries where event_id = ev.id and student_id = old.student_id) then
      insert into public.volunteer_entries(student_id, organization, org_type, role, activity_date, hours, description, status, event_id)
      values (old.student_id, ev.organization, 'Nonprofit', 'Event volunteer', (ev.starts_at at time zone 'UTC')::date,
              ev.duration_hours, 'Attended: ' || ev.title || ' at ' || ev.location, 'draft', ev.id);
      insert into public.notifications(user_id, title, body, link)
      values (old.student_id, 'Attendance confirmed', 'A draft hours entry for ' || ev.title || ' is ready for you to review and submit.', '/hours');
    end if;
  end if;
  return new;
end $$;
create trigger registrations_guard before insert or update on public.event_registrations
  for each row execute function public.registration_guard();

-- helpers
create or replace function public.event_counts()
returns table(event_id uuid, registered bigint) language sql stable security definer set search_path = public as $$
  select event_id, count(*) from public.event_registrations group by event_id
$$;
grant execute on function public.event_counts() to authenticated;

create or replace function public.event_roster(_event uuid)
returns table(registration_id uuid, student_id uuid, full_name text, attended boolean, registered_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.id, r.student_id, p.full_name, r.attended, r.created_at
  from public.event_registrations r join public.profiles p on p.id = r.student_id
  where r.event_id = _event and public.is_event_leader(_event, auth.uid())
  order by r.created_at
$$;
grant execute on function public.event_roster(uuid) to authenticated;

create or replace function public.search_students(_min_hours numeric default 0, _cause text default null, _skill text default null, _org_type text default null)
returns table(id uuid, full_name text, summary text, skills text[], causes text[], verified_hours numeric, org_types text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.summary, p.skills, p.causes,
    coalesce(sum(e.hours) filter (where e.status='verified'),0) as verified_hours,
    coalesce(array_agg(distinct e.org_type) filter (where e.status='verified'), '{}') as org_types
  from public.profiles p
  join public.user_roles ur on ur.user_id = p.id and ur.role = 'student'
  left join public.volunteer_entries e on e.student_id = p.id
  where p.recruiter_visible
    and (public.has_role(auth.uid(),'recruiter') or public.has_role(auth.uid(),'admin'))
    and (_cause is null or exists (select 1 from unnest(p.causes) c where c ilike '%'||_cause||'%'))
    and (_skill is null or exists (select 1 from unnest(p.skills) s where s ilike '%'||_skill||'%'))
  group by p.id
  having coalesce(sum(e.hours) filter (where e.status='verified'),0) >= coalesce(_min_hours,0)
    and (_org_type is null or _org_type = any(coalesce(array_agg(distinct e.org_type) filter (where e.status='verified'), '{}')))
  order by verified_hours desc
$$;
grant execute on function public.search_students(numeric, text, text, text) to authenticated;

-- storage policies for evidence bucket (bucket created separately)
create policy "students upload own evidence" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "students read own evidence" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "students delete own evidence" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = auth.uid()::text);
