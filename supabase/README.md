# Supabase schema

`migrations/001_initial_schema.sql` defines five user-owned tables: `userStats`, `evaluations`, `wardrobeItems`, `outfitCombinations`, and `notificationSettings`.

It enables RLS and defines SELECT/INSERT/UPDATE/DELETE policies comparing `auth.uid()` with `user_id`. The app adds user filters in `hooks/useSupabaseDB.ts`; those filters are convenience, while RLS is the database authorization boundary.

Apply the SQL once to a **new development project** through its SQL editor. The policies/triggers are not idempotent, so do not blindly reapply this migration to an existing production database. It does not establish what is currently deployed in the original hosted project.

Before connecting real data, test as two different authenticated users: each must only read, insert, update, and delete their own rows; cross-user ownership changes must fail. Test unauthenticated requests separately. Supabase UPDATE policies without an explicit WITH CHECK reuse USING for the new row; do not mistake omission alone for an ownership bypass.

Missing pieces: the settings screen references a `delete_user` RPC not defined here; there are no Storage bucket policies or AI functions in this copy. The proposed AI backend is described in [README backend requirements](../README.md#ai-backend). Image URIs currently point to device-local files, not an implemented cloud image store.

Use a publishable/anon key in the app. Never use `service_role` or a Supabase secret key. See the [security and limitations](../README.md#security-and-limitations).
