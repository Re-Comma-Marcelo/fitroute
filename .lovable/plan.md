# Supabase-rechten repareren (diagnose: tabellen staan er, toegang ontbreekt)

## Diagnose (zojuist live gecontroleerd)

- Alle 21 tabellen bestaan en de seed-data staat erin (80 catalogus-oefeningen, routines, maaltijden). Je had dus gelijk: de scripts zijn gedraaid.
- **Maar**: er zijn geen toegangsrechten (`GRANT`s) voor app-gebruikers en **nul RLS-policies**. Daardoor krijgt de app bij elke lees- en schrijfactie "permission denied" / "table not found in schema cache", en vallen onderdelen terug op lokale opslag.
- Ook goed nieuws: ik heb een directe, alleen-lezen verbinding kunnen testen — de database zelf werkt prima.

## Wat ik doe

1. **Nieuw script** `scripts/supabase-migration-grants-policies.sql`:
   - `GRANT` per tabel aan `authenticated` (en `anon` alleen waar de app dat nodig heeft), plus `service_role` overal.
   - **RLS-policies per tabel**, eigenaar-gebaseerd (`user_id = ingelogde gebruiker`):
     - Persoonlijk (volledige toegang alleen eigen rijen): profiles, workouts, workout_sets (via workout), routines + routine_exercises, meal_plan, meal_schedule, meal_entries, custom_meals, week_menu, shopping_checked, body_weight_log, weekly_checkins, coach_notes, coach_chat_messages, coaching_events, cross_training_logs, tracked_lifts, route_checkpoints, route_progress_photos.
     - Catalogus: `exercises` — iedereen leest rijen zonder eigenaar (de 80 standaard-oefeningen), gebruikers beheren alleen hun eigen custom oefeningen.
   - Idempotent geschreven (`DROP POLICY IF EXISTS` vooraf), dus dubbel draaien is onschadelijk.
2. **Uitvoeren** via de bestaande databaseverbinding (`psql`, met ON_ERROR_STOP).
3. **Verifiëren**:
   - Anonieme API-call op `exercises` moet nu data teruggeven (was: permission denied).
   - Controle dat elke tabel minstens één policy heeft en grants kloppen.
   - Preview openen: Home/Train/Dieet laden zonder fallback-meldingen.

## Wat jij nog moet doen (2 minuten, kan ik niet)

**Authentication → URL Configuration** in je Supabase-dashboard:
- Site URL: `https://fitroute.lovable.app`
- Redirect URLs: `https://fitroute.lovable.app/**` en `https://id-preview--6348699b-3af7-46e0-9c05-163e356b7bc2.lovable.app/**`

Dit is nodig voor bevestigingsmails en Google-login van je ouders/vrienden.

## Technische details

- Geen frontend-wijzigingen; geen schema-wijzigingen aan tabellen zelf.
- `user_id`-kolommen zijn tekst; policies casten `auth.uid()` correct.
- De bestaande lokale fallback in de app blijft als vangnet, maar is hierna niet meer nodig.
- Na goedkeuring voer ik direct uit en rapporteer ik per stap het resultaat.
