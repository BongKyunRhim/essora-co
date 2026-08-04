-- Applicants may delete their own submissions only while payment hasn't
-- happened. Once a request is paid it is immutable from the applicant side.
drop policy if exists "applicant deletes own unpaid request" on public.requests;
create policy "applicant deletes own unpaid request" on public.requests
  for delete using (
    auth.uid() = applicant_id
    and payment_status = 'unpaid'
  );
