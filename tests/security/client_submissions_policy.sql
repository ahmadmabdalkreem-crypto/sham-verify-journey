-- Run through the read-only database query tool; every result must be true.
SELECT
  NOT has_table_privilege('anon', 'public.client_submissions', 'INSERT')
    AS anonymous_insert_is_denied,
  has_table_privilege('authenticated', 'public.client_submissions', 'INSERT')
    AS authenticated_insert_is_granted,
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.client_submissions'::regclass)
    AS row_security_is_enabled,
  (SELECT count(*) = 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_submissions'
      AND cmd IN ('INSERT', 'ALL'))
    AS exactly_one_insert_policy,
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'client_submissions'
      AND policyname = 'Authenticated users insert own submissions'
      AND cmd = 'INSERT' AND roles = ARRAY['authenticated']::name[]
      AND permissive = 'PERMISSIVE'
      AND regexp_replace(with_check, '\s+', ' ', 'g') =
        '((( SELECT auth.uid() AS uid) IS NOT NULL) AND (( SELECT auth.uid() AS uid) = user_id))'
  ) AS insert_requires_verified_owner;