# Supabase echt aanzetten: migraties uitvoeren + Site URL

## Wat ik doe (migraties)

De secrets `FORJA_SUPABASE_URL`, `FORJA_SUPABASE_PUBLISHABLE_KEY` en `FORJA_SUPABASE_DB_URL` zijn al opgeslagen in het project. Met de database-URL kan ik de scripts rechtstreeks uitvoeren via `psql` — je hoeft de SQL Editor niet te openen.

1. **Test de verbinding** met `FORJA_SUPABASE_DB_URL` (alleen een `SELECT 1`).
2. **Voer de scripts uit in volgorde**, elk met `ON_ERROR_STOP`:
   1. `scripts/supabase-schema.sql` — tabellen, RLS, grants
   2. `scripts/supabase-seed.sql` — oefeningen, maaltijden, routines
   3. `scripts/supabase-migration-coaching.sql`
   4. `scripts/supabase-migration-body-weight.sql`
   5. `scripts/supabase-migration-language.sql`
   6. `scripts/supabase-migration-profile-targets.sql`
   7. `scripts/supabase-migration-route.sql`
   8. `scripts/supabase-migration-meal-entries.sql`
   9. `scripts/supabase-migration-week-menu.sql`
   10. `scripts/supabase-migration-custom-meals.sql`
3. **Verifieer**: lijst van aangemaakte tabellen + rijtellingen (oefeningen, maaltijden) om te bevestigen dat schema en seed gelukt zijn.
4. **Schema cache verversen**: `NOTIFY pgrst, 'reload schema';` zodat PostgREST de nieuwe tabellen direct ziet (lost de eerdere "table not found in schema cache" fouten op).
5. **Test in de app**: preview openen, inloggen werkt al; check dat Home/Train/Dieet data laden zonder fallback-meldingen.

Als een script faalt (bijv. "already exists" omdat je deels al iets hebt uitgevoerd), rapporteer ik welke stap en pas ik alleen dat deel idempotent aan — niets wordt stilletjes overgeslagen.

## Wat jij moet doen (Site URL — kan ik niet)

De Site URL zit in het dashboard, niet in de database. Twee minuten werk:

1. Ga naar **Authentication → URL Configuration** in je Supabase-project.
2. Zet **Site URL** op `https://fitroute.lovable.app`.
3. Voeg bij **Redirect URLs** toe:
   - `https://fitroute.lovable.app/**`
   - `https://id-preview--6348699b-3af7-46e0-9c05-163e356b7bc2.lovable.app/**`
4. Save.

Zonder dit sturen bevestigings- en reset-mails naar de verkeerde plek en breekt Google-login.

## Technische details

- Verbinding: `psql "$FORJA_SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f <script>` — de waarde wordt nooit gelogd of getoond.
- Alle scripts staan al in `scripts/`; er wordt geen SQL herschreven, alleen uitgevoerd.
- Fallback-gedrag in de app (`custom_meals`, `coaching_events`) blijft bestaan als veiligheid, maar is na deze migraties niet meer nodig.
- Geen frontend-wijzigingen; geen nieuwe secrets nodig.
