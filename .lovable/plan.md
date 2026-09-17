# Supabase zelf aanzetten: handleiding + controle achteraf

Jij voert de scripts zelf uit in je Supabase-dashboard. Ik lever een duidelijke handleiding en controleer achteraf vanuit de app of alles werkt.

## Stap 1 — SQL-scripts uitvoeren (jij)

Ga naar je Supabase-project → **SQL Editor** → **New query**. Plak per script de volledige inhoud en klik **Run**. Volgorde is belangrijk:

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

De bestanden staan klaar in de projectmap `scripts/`; open ze hier in de editor om te kopiëren.

**Waar je op let:**
- "Success. No rows returned" is goed.
- "already exists" → dat deel was al uitgevoerd; ga door met het volgende script en meld het mij.
- Elke andere fout: stop, kopieer de foutmelding hierheen — ik pas het script aan.

Sluit af met dit losse commando in de SQL Editor om de tabel-cache te verversen (lost de eerdere "not found in schema cache" fouten op):
```sql
NOTIFY pgrst, 'reload schema';
```

## Stap 2 — Site URL instellen (jij)

**Authentication → URL Configuration**:
- Site URL: `https://fitroute.lovable.app`
- Redirect URLs toevoegen:
  - `https://fitroute.lovable.app/**`
  - `https://id-preview--6348699b-3af7-46e0-9c05-163e356b7bc2.lovable.app/**`
- Save.

Zonder dit breken bevestigingsmails en Google-login.

## Stap 3 — Controle (ik)

Zodra jij zegt dat het klaar is:
1. Ik test de verbinding vanuit de app (lezen van oefeningen/maaltijden via de bestaande datafuncties).
2. Ik check dat de fallback-waarschuwingen (`custom_meals`, `coaching_events`) verdwenen zijn.
3. Ik rapporteer welke tabellen en hoeveel rijen er staan, zodat je zeker weet dat schema + seed gelukt zijn.

## Technische details

- Geen frontend-wijzigingen, geen nieuwe secrets — `FORJA_SUPABASE_URL` en `FORJA_SUPABASE_PUBLISHABLE_KEY` zijn al opgeslagen en werkend.
- De app blijft intussen werken met lokale fallback; niets breekt als je dit op een rustig moment doet.
- Eventuele "already exists"-varianten pas ik idempotent aan als je ze tegenkomt.
