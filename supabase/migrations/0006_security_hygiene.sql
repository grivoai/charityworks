-- Advisor hygiene, no behaviour change.
--
-- 1. Pin set_updated_at()'s search_path. Its body references only now() and the
--    NEW record, so an empty search_path is safe and closes the
--    function_search_path_mutable advisory.
alter function public.set_updated_at() set search_path = '';

-- 2. Take rls_auto_enable() off the public API. It is an event-trigger function
--    that auto-enables RLS on new public tables; it has no reason to be callable
--    over PostgREST. Event triggers fire via the DDL event mechanism regardless
--    of EXECUTE grants, so revoking these does not affect the auto-RLS behaviour
--    — it only closes the anon/authenticated SECURITY DEFINER advisories.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
