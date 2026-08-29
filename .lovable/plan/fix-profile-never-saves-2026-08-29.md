# Fix: profile never saves

## What is actually happening (confirmed against your database)

Saving the profile fails on the database, not in the UI. I ran the exact same write the
app performs and got back:

```text
PGRST204: Could not find the 'idioma' column of 'profiles' in the schema cache
```

Your `profiles` table has every column except `idioma` (the UI-language column added when
we built the translation feature). The migration file `scripts/supabase-migration-language.sql`
was never applied to your Supabase project, so every profile save is rejected — that is why
the form still shows the default 80 kg / 178 cm values and your name never sticks
(the only row in `profiles` is the old seed row with `user_id = 'demo'`).

Reads work, and other writes (coach notes) already land, so auth and the write path are fine.

## The fix

**1. Add the missing column in your Supabase project (you run this once)**

In the Supabase SQL editor:

```sql
alter table public.profiles
  add column if not exists idioma text not null default 'en';
```

That is exactly what `scripts/supabase-migration-language.sql` contains. After that, save works.

**2. Make failures visible instead of generic (code change)**

Today a failed save shows only "Could not save your profile. Try again.", which hides the
real cause. I will:

- Surface the server error text in the toast (e.g. the PostgREST message), truncated, so a
  schema/permission problem is diagnosable at a glance.
- Log the underlying error to the console for debugging.

**3. Stop the silent write on language switch**

`use-language-sync.ts` swallows every error when persisting the language, so a broken save
looks like "the language just resets". I will keep the local preference working but show a
one-time toast when the profile write fails.

**4. Fresh read after save**

`src/lib/data/profile.ts` keeps a module-level cache that short-circuits refetches. After a
save it will be invalidated properly so the header/summary reflect the stored row rather than
the in-memory copy.

## Technical notes

- Files touched: `src/routes/_authenticated/perfil.tsx`, `src/lib/i18n/use-language-sync.ts`,
  `src/lib/data/profile.ts`. New strings go into `src/lib/i18n/dict/profile.ts` for en/pt/nl.
- No schema change from my side (your Supabase is external — the `alter table` above is the
  one step only you can run), and no changes to `db.server.ts`, `forja.functions.ts`, auth,
  MCP or the service worker.
- Optional follow-up: a startup check that compares expected profile columns against the
  database and warns in the console when a migration is pending — say the word if you want it.
