-- Pin search_path on the trigger functions.
-- APPLIED to prod (ygmxxveranmfcobcexon) 2026-08-10 as `function_search_path`, on Perez's
-- authorization. Verified after: pg_proc.proconfig reads search_path="" for both, and both
-- function_search_path_mutable advisories cleared.
--
-- Supabase's linter flags both of these as `function_search_path_mutable`. A function
-- with an unpinned search_path resolves unqualified names against whatever the CALLER's
-- search_path happens to be, so anyone able to create an object in an earlier schema can
-- shadow a name the function body relies on and have their version run instead.
--
-- `set search_path = ''` is the strict form: nothing resolves unqualified, so every
-- reference inside the body must be schema-qualified. Both function bodies below touch
-- only OLD/NEW record fields and raise exceptions — no table, type or operator lookups —
-- so neither needs a qualified name and the empty path is safe as-is.
--
-- profiles_block_username_change came in with 0005 (username permanence).
-- predictions_block_field_mutation came in with 0003 (receipts immutability); it has
-- carried this warning since June and is fixed here rather than left as the only
-- outstanding lint of its kind.
--
-- rollback:
--   alter function public.profiles_block_username_change() reset search_path;
--   alter function public.predictions_block_field_mutation() reset search_path;

alter function public.profiles_block_username_change() set search_path = '';
alter function public.predictions_block_field_mutation() set search_path = '';
