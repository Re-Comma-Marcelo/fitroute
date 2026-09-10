# Herontwerp dieet-pagina

Zelfde stijl als nu (donkere kaarten, ronde hoeken, bestaande accentkleur). Geen nieuwe kleuren. De pagina wordt opnieuw ingedeeld zodat je in één blik ziet wat gepland is, wat de coach voorstelt en wat je al gegeten hebt.

## 1. Bovenkant

- Titel wordt een dagselector: "Vandaag" met pijltje om een andere dag (tot 7 dagen terug, en morgen) te kiezen. De hele pagina volgt die dag.
- De tabs Week en Markt blijven zoals ze nu zijn.

## 2. Caloriebudget-kaart

- Groot getal: hoeveel calorieën je nog kunt eten.
- Voortgangsbalk in de bestaande accentkleur.
- Onder de balk: "X calorieën gegeten" en "Doel: X".
- Sub-regel: geschat verbrand tijdens je training van die dag, met het woord "geschat" erbij zodat het niet als meting overkomt. De schatting komt uit duur en zwaarte van je gelogde sessie.

## 3. Macro-overzicht

- Drie kaartjes naast elkaar: koolhydraten, eiwitten, vetten, elk met ring en "X g over".
- Daaronder één compacte waterregel (glazen, − / +) in plaats van de huidige grote waterkaart.

## 4. Maaltijden — de kern

Drie duidelijk gescheiden secties met eigen kop.

**A. Gepland voor vandaag**
- Gegroepeerd per eetmoment (Ontbijt / Lunch / Diner / Tussendoortje), maar meerdere maaltijden per moment zijn toegestaan. Geen waarschuwing of blokkade meer als een moment al gevuld is.
- Per maaltijd optioneel een tijdstip, zodat "Tussendoortje 10:30" en "Tussendoortje 15:00" logisch gesorteerd staan.
- Elke kaart toont naam, kcal, korte macro's en het eetmoment (plus tijd als je die zet).
- Al gegeten? Vinkje en iets minder nadruk, kaart blijft staan.
- Duidelijke actie onderaan de sectie: "Plan een maaltijd" — eerst moment kiezen, dan maaltijd.
- Lege staat: korte uitleg plus dezelfde knop.

**B. Aanbevolen door je coach**
- Voorstellen op basis van wat er vandaag nog open staat aan calorieën en macro's.
- Kaarten met een klein "Aanbevolen"-label en dezelfde coach-markering die de app elders gebruikt.
- Eén actie: "Toevoegen aan vandaag" — de maaltijd verhuist direct naar Gepland.
- Geen voorstellen? Inklapbaar met een korte functionele reden (bijvoorbeeld: dagdoel is al gedekt).

**C. Overige gegeten maaltijden**
- Spontaan gelogde maaltijden zonder planning, op tijd gesorteerd, als lichte lijst zonder actie-nadruk.

## 5. Coach-update (vervangt "Tip van de dag")

- De statische tip verdwijnt. In plaats daarvan één coach-kaart met een tekst die uit je dag van vandaag komt: veel eiwit open en al laat op de dag → verwijzing naar een concrete aanbevolen maaltijd; bijna vol → "nog 120 kcal over, houd de avond licht"; goede reeks dagen → korte erkenning; niets bijzonders → nuchtere observatie over waar de dag staat.
- Toon: direct, menselijk, geen aanmoediging over de top, geen schuldgevoel. Zelfde kaartbehandeling als andere coach-momenten.

## 6. Opslag

Meerdere maaltijden per eetmoment past niet in de huidige database-opzet (die houdt precies één maaltijd per moment vast). Daarom:

- De nieuwe indeling werkt direct op je telefoon, opgeslagen op het apparaat, met overname van wat je nu al gepland en gegeten hebt.
- Ik lever een SQL-script mee dat je later in Supabase draait; zodra de tabel bestaat, synchroniseert het zonder verdere aanpassing.
- Bestaande week- en marktpagina blijven werken op de huidige opzet.

## Technische details

- Nieuw: `src/lib/diet-day.ts` (type `DietEntry`: id, datum, moment, optioneel tijd, mealId, gepland/gegeten, herkomst) met local-first opslag en eenmalige migratie uit `meal_plan` + `forja.eaten.v1`.
- Nieuw: `src/lib/data/diet-entries.ts` als enige toegangspunt (lezen, toevoegen, gegeten aan/uit, verwijderen), met tolerante Supabase-lees/schrijf-functies in `forja.functions.ts` die stil terugvallen op lokaal wanneer de tabel ontbreekt.
- Nieuw: `scripts/supabase-migration-meal-entries.sql` (tabel + GRANTs + RLS op `auth.uid()`).
- Nieuw: `src/lib/nutrition-burn.ts` voor de trainingsschatting; `src/lib/coach/nutrition.ts` uitgebreid zodat het naar een concrete aanbevolen maaltijd kan verwijzen.
- Herschreven: `src/routes/_authenticated/dieta.index.tsx`, plus componenten `DaySelector`, `CalorieBudgetCard`, `MacroSummary` (met waterregel), `PlannedMealsSection`, `CoachSuggestionsSection`, `UnplannedEatenList`, `CoachUpdateCard`. `MealCard` krijgt een compacte lijstvariant; `MealPickerSheet` krijgt momentkeuze zonder blokkade.
- Alle nieuwe teksten via i18n (EN/PT/NL) in een nieuw dictionary-fragment. Afsluiten met Prettier, typecheck en build.
