# Wat je exact in Supabase moet doen

Je hebt een extern (eigen) Supabase-project. De app leest/schrijft via server
functions met de service-role key; de browser raakt Supabase nooit direct. Om
alle nieuwe tabellen en oefeningen te laten werken hoef je alleen een paar SQL-
bestanden één keer te draaien in de SQL-editor van je project. Ze zijn allemaal
idempotent (veilig om opnieuw te draaien).

## De fout die je zag

```
Could not find the table 'public.custom_meals' in the schema cache
Could not find the table 'public.coaching_events' in the schema cache
```

Dat betekent: je huidige database mist tabellen die de app verwacht. De
schema-cache van PostgREST verversen doe je sowieso na een `create table` —
dat gebeurt meestal automatisch binnen enkele seconden, of via
`select pg_notify(...)` / de knop "Reload schema cache" in de SQL-editor.

## Wat moet je draaien (één keer, in deze volgorde)

Alle bestanden staan in `scripts/` in het project. Open ze, plak ze in de
Supabase SQL-editor en voer uit. Volgorde:

```text
1. scripts/supabase-schema.sql          — alle basistabellen (profiel,
                                          oefeningen, routines, workouts, sets,
                                          coach_notes, voeding, custom_meals,
                                          tracked_lifts) + grants + RLS + triggers
2. scripts/supabase-seed.sql             — demo-gegevens: 80 oefeningen
                                          (inclusief de nieuwe: Preacher Curl,
                                          Seated Dumbbell Curl, Chest-Supported
                                          Row, Hack Squat, Bulgarian Split Squat,
                                          Cable Lateral Raise, Hip Thrust, …),
                                          routines en voorbeeld-workouts
3. scripts/supabase-migration-coaching.sql  — coaching_events, cross_training_logs,
                                          coach_chat_messages + kolom
                                          workout_sets.coach_note
4. scripts/supabase-migration-body-weight.sql — body_weight_log + kolom
                                          routines.dias_semana (weekroostering)
```

De andere twee bestandjes (`supabase-migration-custom-meals.sql` en
`supabase-migration-language.sql`) hoef je **niet** te draaien — die tabellen/
kolommen zitten al in `supabase-schema.sql` (custom_meals en profiles.idioma).
Ze zijn onschadelijk als je ze toch draait, maar overbodig.

## Waarom deze volgorde

- Stap 1 maakt de tabellen aan die stap 2 en 4 nodig hebben.
- Stap 2 voegt de oefeningen toe (`on conflict do nothing` — bestaande blijven
  staan, nieuwe worden bijgevoegd). Re-runnen voegt dus alleen het verschil toe.
- Stappen 3 en 4 voegen de adaptive-coaching- en gewicht-logtabellen toe die
  later zijn toegevoegd en nog niet in je oorspronkelijke schema zaten.

## Verifiëren

Na het draaien, in de SQL-editor:

```sql
-- moet 80 oefeningen tonen
select count(*) from public.exercises;

-- moet tabellen tonen: custom_meals, coaching_events, cross_training_logs,
-- coach_chat_messages, body_weight_log
select tablename from pg_tables where schemaname = 'public' order by 1;
```

Ververs daarna de schema-cache (Supabase SQL-editor: knop "Reload schema
cache", of even wachten). Start de app opnieuw of refresh de preview — de
"Could not find the table" fouten zijn dan weg en nieuwe oefeningen staan in de
bibliotheek.

## Geheimen / sleutels

De server functions lezen `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` en
`SUPABASE_SERVICE_ROLE_KEY` uit de omgeving. Controleer dat die drie secrets
in Lovable staan (Project Settings → Secrets / Connectors). De service-role key
moet van je eigen Supabase-project komen. Niks hiervan gaat in de broncode.
