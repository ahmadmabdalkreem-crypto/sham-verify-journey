DROP POLICY "anyone can insert submissions" ON public.client_submissions;
REVOKE INSERT ON TABLE public.client_submissions FROM anon;
GRANT INSERT ON TABLE public.client_submissions TO authenticated;
CREATE POLICY "Authenticated users insert own submissions"
ON public.client_submissions
FOR INSERT
TO authenticated
WITH CHECK ((SELECT auth.uid()) IS NOT NULL AND (SELECT auth.uid()) = user_id);