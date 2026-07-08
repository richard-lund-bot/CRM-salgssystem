-- Treningsapp v2 — hardening (M2): lukk security advisor-funnene
-- «Public / Signed-In Users Can Execute SECURITY DEFINER Function».
--
-- Funksjonene er kun trigger-funksjoner. Triggere kaller dem uavhengig av
-- EXECUTE-rettigheten til den som utløser triggeren, så det er trygt (og
-- riktig) å trekke tilbake EXECUTE fra klientrollene. Da kan ingen innlogget
-- eller anonym bruker kalle dem direkte via RPC.
-- Idempotent — trygg å kjøre på nytt.

revoke execute on function public.sett_oppdatert() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Plattform-hjelper som overlevde fra tidligere prosjekt (event trigger som
-- auto-aktiverer RLS på nye tabeller). Samme advarsel, samme fiks.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
  ) then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;
