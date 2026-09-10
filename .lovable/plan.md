# Wekelijkse boodschappenlijst met kort maaltijd-interview

Elke week begint met een korte keuze: uit een ruime set aanbevolen gerechten pik je wat je die week wilt eten. Daaruit rolt automatisch één samengevoegde boodschappenlijst plus een overzicht "Deze week op het menu". Alles in de huidige stijl van de app — geen nieuwe kleuren of kaartvormen.

## Wat de gebruiker gaat zien

**1. Nieuwe week, nieuwe lijst**
- De lijst hoort bij de week (maandag t/m zondag, dezelfde weeklogica als de rest van de app).
- Zodra een nieuwe week start, wordt de lijst van vorige week bewaard onder "Vorige week" (inklapbaar onderaan de boodschappenpagina) en is de actieve lijst leeg.
- Zolang de keuze niet is gemaakt, staat op de boodschappenpagina een korte uitleg met de knop "Start deze week" — geen lege lijst zonder context. Op de homepagina komt één regel met dezelfde knop, die verdwijnt zodra het gedaan is.

**2. Het interview (30 sec)**
- Eén scherm met een raster van aanbevolen gerechten (foto, naam, kcal, korte macro-regel), gerangschikt met dezelfde coach-logica die de dieet-pagina al gebruikt (doelen, macro-gap, trainingsdagen, je eigen maaltijden eerst).
- Ruime set: meerdere gerechten per eetmoment (ontbijt/lunch/diner/tussendoortje), samen ongeveer 16–20 kaarten, zodat er echt te kiezen valt.
- Tikken = kiezen, opnieuw tikken = weghalen. Geen minimum of maximum. Bovenaan een voortgangsregel "X gekozen" en, zolang er niets staat, de hint "Kies er een paar om te starten".
- "Meer laten zien" laadt een volgende ronde suggesties in hetzelfde raster.
- Afsluiten met "Maak mijn lijst" → korte bevestiging en direct naar de boodschappenlijst.

**3. De boodschappenlijst**
- Ingrediënten van alle gekozen gerechten, samengevoegd en ontdubbeld (drie gerechten met kip = één regel kip met de totale hoeveelheid), gegroepeerd per categorie zoals nu, met dezelfde afvink- en verwijderinteractie, de kostenschatting en het delen/wissen dat er al is.
- Bezorgmaaltijden blijven zoals nu apart onder "Ordering out" staan.
- De huidige keuze "Volgende 3 / 7 dagen" verdwijnt; de lijst is de week.

**4. Deze week op het menu**
- Onder de lijst de gekozen gerechten als kaarten in exact dezelfde stijl als de coach-aanbevelingen op de dieet-pagina (met label "Aanbevolen").
- Per gerecht één tik om het aan een dag + eetmoment van deze week toe te wijzen; dat verschijnt meteen onder "Gepland" op de dieet-pagina.
- Al ingeplande gerechten laten zien op welke dag ze staan.

**5. Halverwege de week bijkiezen**
- Knop "Meer maaltijden kiezen" opent hetzelfde interview met je huidige keuzes al aangevinkt. Nieuwe gerechten worden toegevoegd; afgevinkte boodschappen blijven afgevinkt.
- De keuzes van de week voeden ook de sectie "Aanbevolen door je coach" op de dieet-pagina: die gerechten komen die week bovenaan, zodat je kookt met wat je in huis hebt.

## Lege situaties
- Niets gekozen → lijst blijft leeg met uitleg en de knop om het interview (opnieuw) te doen. Nooit automatisch een lijst zonder jouw input.
- Interview overgeslagen → prompt blijft staan, geen fallback-lijst.

## Technische aanpak

- **Nieuw:** `src/lib/week-menu.ts` — versioned localStorage `forja.weekMenu.v1`: per weekstart (ISO maandag via bestaande `weekDates`) de gekozen meal-ids, `completedAt`, en een archief van afgeronde weken (gekozen ids + snapshot van afgevinkte items). Helpers: `currentWeekStart()`, `getWeekMenu()`, `toggleSelection()`, `completeWeek()`, `archiveIfNewWeek()`.
- **Nieuw:** `src/lib/data/week-menu.ts` — local-first accessor met achtergrond-sync naar een optionele tabel, zelfde patroon als `src/lib/data/diet-entries.ts` (tolerant bij ontbrekende tabel).
- **Nieuw:** `scripts/supabase-migration-week-menu.sql` — tabel `week_menu` (user_id, week_start, meal_id, created_at) met grants en RLS op `auth.uid()`; later uit te voeren, niets breekt zonder.
- **Nieuw:** `src/routes/_authenticated/dieta.interview.tsx` — interviewscherm; suggestiepool via bestaande `rankMeals` uit `src/lib/nutrition-swap.ts` met `getTargets`, `getTrainingTags` en `getMeals` (geen tweede aanbevelingsengine).
- **Nieuw component:** `src/components/diet/WeekMenuGrid.tsx` (selecteerbare kaarten) en `src/components/diet/WeekMenuSection.tsx` ("Deze week op het menu" + toewijzen aan een dag, hergebruikt de kaartstijl van `CoachSuggestionsSection`).
- **Aanpassen:** `src/lib/data/nutrition.ts` — merge-logica uit `getShoppingList` hergebruiken in een nieuwe `shoppingListFromMeals(meals)`; `getShoppingList` blijft bestaan voor bestaande aanroepen.
- **Aanpassen:** `src/routes/_authenticated/dieta.market.tsx` — bron wordt de weekselectie, range-toggle eruit, prompt-staat, menu-sectie, "Meer maaltijden kiezen", inklapbaar archief.
- **Aanpassen:** `src/routes/_authenticated/dieta.index.tsx` — weekselectie als voorkeur in de coach-suggesties.
- **Aanpassen:** `src/routes/_authenticated/inicio.tsx` — regel met "Start deze week" zolang het interview open staat.
- **i18n:** nieuw fragment `src/lib/i18n/dict/round31.ts` (en/pt/nl) registreren in `src/lib/i18n/index.tsx`; geen losse hardcoded teksten.
- Afsluiten met Prettier, `bunx tsgo --noEmit`, buildcheck en een visuele controle van `/dieta/market`, het interview en `/dieta/`.
