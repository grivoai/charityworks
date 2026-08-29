-- Durable, cross-instance login throttling for the admin sign-in.
--
-- Replaces the process-local in-memory counter in auth-actions.ts, which on a
-- serverless platform reset on every cold start and counted per instance. These
-- counts live in Postgres, so a limit holds across every deployment instance and
-- across restarts. Two independent buckets are kept per attempt: the caller's IP
-- and the target email (see src/lib/auth-throttle.ts).
--
-- Written and read only by the service-role client. RLS is enabled with no
-- policies, so — like every other table here — the anon and authenticated roles
-- get nothing; the service role bypasses RLS.

create table if not exists public.login_throttle (
  key          text primary key,                 -- 'ip:<addr>' or 'email:<lowercased>'
  failures     integer     not null default 0,
  window_start timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.login_throttle enable row level security;

-- Atomic upsert-and-count. Returns the failure count in the current window,
-- resetting the window when the previous one has elapsed. Doing this in one
-- statement avoids the read-modify-write race two concurrent failures would hit.
create or replace function public.login_throttle_bump(
  p_key text,
  p_window_seconds integer
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_failures integer;
begin
  insert into public.login_throttle as t (key, failures, window_start, updated_at)
  values (p_key, 1, now(), now())
  on conflict (key) do update
    set failures = case
          when t.window_start < now() - make_interval(secs => p_window_seconds) then 1
          else t.failures + 1
        end,
        window_start = case
          when t.window_start < now() - make_interval(secs => p_window_seconds) then now()
          else t.window_start
        end,
        updated_at = now()
  returning t.failures into v_failures;

  return v_failures;
end;
$$;

-- Only the server (service role) may call this. Keep it off the public API so it
-- does not join the advisor's list of anon-executable SECURITY DEFINER/INVOKER
-- functions, and so it cannot be used to probe which emails are being throttled.
revoke all on function public.login_throttle_bump(text, integer) from public, anon, authenticated;
grant execute on function public.login_throttle_bump(text, integer) to service_role;
