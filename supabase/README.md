# Supabase

Local Supabase config + migrations for WaveTap. The hosted project is **`Wavetap`**
(region `ap-southeast-2` / Sydney). Schema lives in `../05_DATA_MODEL.md`; RLS/auth in
`../06_AUTH_SECURITY_PRIVACY.md`.

## Workflow

1. `supabase login` → `supabase link --project-ref <ref>`
2. Write migrations in `migrations/` (Phase 02 — schema from `05_DATA_MODEL.md`).
3. Apply with `supabase db push`, or rely on the GitHub integration (push-to-deploy).
4. Generate types: `supabase gen types typescript --linked > ../packages/api/src/database.types.ts`,
   then replace the `Database` placeholder in `@wavetap/api`.

> Per the 2026-06-03 Supabase config ADR, **"auto-expose new tables" is OFF** — include the
> Data API grants in each table's migration so schema and access ship together.
