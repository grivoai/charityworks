-- Retention for the login and enquiry throttle counters.
--
-- `login_throttle` is the one table whose row count someone outside can drive.
-- Rows are only ever deleted by `clearFailures()`, which runs after a
-- SUCCESSFUL sign-in — so every address that fails and never succeeds, and
-- every address that sends an enquiry, leaves a row behind permanently. A
-- distributed credential-stuffing run or a crawler writes one row per address,
-- forever, and nothing reads any of them again once their window has elapsed.
--
-- A row is dead as soon as its window has passed: `login_throttle_bump` resets
-- `failures` and `window_start` when it finds a stale window, so an old row is
-- worth exactly as much as no row. 48 hours is comfortably past the longest
-- window in use (24h, the enquiry daily bucket) with room for clock skew.

create or replace function public.login_throttle_prune()
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_deleted integer;
begin
  delete from public.login_throttle
   where window_start < now() - interval '48 hours';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.login_throttle_prune() from public, anon, authenticated;
grant execute on function public.login_throttle_prune() to service_role;

-- pg_cron so the prune runs without anything in the application having to
-- remember. Installed into its own schema, which is where Supabase expects it.
create extension if not exists pg_cron with schema pg_catalog;

-- Idempotent: unschedule first so re-running this migration does not stack
-- duplicate jobs.
select cron.unschedule('login-throttle-prune')
 where exists (select 1 from cron.job where jobname = 'login-throttle-prune');

select cron.schedule(
  'login-throttle-prune',
  '17 4 * * *',
  $$select public.login_throttle_prune();$$
);
