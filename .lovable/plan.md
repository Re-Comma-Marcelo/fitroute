# De 5 dieet-verbeteringen afmaken en oplappen

De vijf punten uit het dieetplan zijn gebouwd, maar er zitten nog echte gebreken in. Dit is de opschoonronde. Frontend-only, geen Supabase-wijzigingen.

## 1. Maaltijd toevoegen faalt (blokkerend)

De opslag schrijft naar de Supabase-tabel `custom_meals`, die in jouw project nog niet bestaat (`scripts/supabase-migration-custom-meals.sql` is niet uitgevoerd). `createCustomMeal` in `src/lib/data/nutrition.ts` heeft geen terugvalpad, dus de fout landt in het formulier en de maaltijd verdwijnt.

Fix: `createCustomMeal` en `removeCustomMeal` krijgen dezelfde try/catch-terugval als de coachlaag — mislukt de server-call, dan wordt de maaltijd lokaal opgeslagen (localStorage) en in de cache gezet. Bij laden worden lokale en server-maaltijden samengevoegd, ontdubbeld op `id`. Echte invoerfouten blijven zichtbaar als toast.

Wil je echte opslag op alle apparaten: voer die migratie één keer uit in de SQL-editor van Supabase. De terugval blijft dan het offline-vangnet.

## 2. Eaten-diary: ongeldige knop-in-knop

In `MealCard` zit de favoriet-knop binnen de grote maaltijd-knop. Dat is ongeldige HTML en zorgt voor onbetrouwbare taps op mobiel.

Fix: de kaart wordt een `div` met een aparte, volledige tap-zone voor selecteren, met favoriet en "eaten" als broertjes ernaast. Tap-doelen blijven 44px.

## 3. Favorieten in de maaltijdkiezer reageren niet

`MealPickerSheet` leest favorieten tijdens render en wisselt ze via een dynamische import zonder state-update: de sterretjes veranderen pas als je het paneel opnieuw opent.

Fix: favorieten in lokale state, statische import van `toggleMealFavorite`, direct opnieuw renderen na een tap. Hetzelfde voor het Today-scherm.

## 4. Hydratatie: `window.prompt` eruit

Het instellen van je waterdoel gebruikt nu een browser-prompt, wat lelijk is in een PWA.

Fix: doel aanpassen met −/+ stappen in de kaart zelf (bereik 4–16 glazen), zonder prompt.

## 5. Coach-inzicht en repeat-yesterday netjes

- De teksten van het nieuwe voedings-inzicht staan hardcoded in het Engels; die gaan door de bestaande i18n-woordenboeken (EN/PT/NL), zoals de rest van de app.
- `repeatYesterdayToToday` bevat nog dode code en schrijft ook slots die vandaag al gevuld zijn; dat wordt teruggebracht tot alleen lege slots vullen, met undo-toast.
- De macro-ringen krijgen een klein label "Planned" / "Eaten", zodat duidelijk is wat je ziet.

## Technische details

- Geraakte bestanden: `src/lib/data/nutrition.ts`, `src/lib/nutrition-local.ts`, `src/components/nutrition-ui.tsx`, `src/components/MealPickerSheet.tsx`, `src/components/HydrationCard.tsx`, `src/routes/_authenticated/dieta.index.tsx`, `src/lib/coach/nutrition.ts`, `src/lib/i18n/dict/diet.ts`.
- Geen schemawijziging, geen nieuwe tabellen, geen migratie vanuit de code.
- Afsluiten met typecheck en build.
