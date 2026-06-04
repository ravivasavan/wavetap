-- Record Terms of Service acceptance at onboarding (route spec 11 requires a
-- terms step). Both nullable; set when the user accepts during onboarding.
alter table public.profiles add column if not exists accepted_terms_at timestamptz;
alter table public.profiles add column if not exists tos_version text;
