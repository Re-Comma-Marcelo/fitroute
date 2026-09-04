# Fix: maaltijd toevoegen aan dieet mislukt

## Wat er gebeurt

Bij het opslaan van een nieuwe maaltijd schrijft de app naar de Supabase-tabel `custom_meals`. Die tabel bestaat nog niet in jouw project (`scripts/supabase-migration-custom-meals.sql` is nooit uitgevoerd), dus de schrijfactie faalt met "Could not find the table 'public.custom_meals' in the schema cache".

Lezen is al bestand tegen die situatie (dat geeft een lege lijst terug), maar `createCustomMeal` in `src/lib/data/nutrition.ts` heeft geen terugvalpad: de fout komt ongefilterd terug in het maaltijd-formulier en de maaltijd verdwijnt.

## Oplossing

Twee sporen — spoor 1 lost het nu op, spoor 2 maakt het echt persistent.

### 1. Lokale terugval bij het opslaan (code)
- `createCustomMeal` en `removeCustomMeal` krijgen dezelfde try/catch-terugval als de coaching-laag: mislukt de server-call, dan wordt de maaltijd lokaal bewaard (localStorage, sleutel `ironlogger.customMeals.v1`) en direct in de in-memory cache gezet.
- Bij het laden van de maaltijdbibliotheek worden de lokale maaltijden samengevoegd met wat Supabase teruggeeft, ontdubbeld op `id`.
- Hetzelfde terugvalpad voor het plannen van een maaltijd in een slot, zodat een net toegevoegde maaltijd ook echt in de dag geplaatst kan worden als de tabel ontbreekt.
- Fouten die niet over een ontbrekende tabel gaan (bijv. ongeldige invoer) blijven wél zichtbaar als toast, zodat we geen echte fouten wegmoffelen.

### 2. Migratie uitvoeren (jij, één keer)
Voer `scripts/supabase-migration-custom-meals.sql` uit in de SQL-editor van je Supabase-project. Daarna slaan eigen maaltijden op in de database en werkt het op al je apparaten; de lokale terugval blijft alleen als vangnet bij offline gebruik.

## Technische details

- Alleen frontend/datalaag: `src/lib/data/nutrition.ts` (terugval + samenvoegen) en een kleine foutmelding-verfijning in `src/components/AddMealSheet.tsx`.
- Geen schemawijziging vanuit de code, geen nieuwe tabellen, Supabase blijft ongemoeid.
- Nieuwe of gewijzigde teksten gaan via de bestaande i18n-woordenboeken (EN/PT/NL).
