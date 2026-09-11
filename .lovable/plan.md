# Categorieën als uitklapbare blokken met eigen "Meer laten zien"

De keuzepagina wordt een compacte lijst van vier categorieën in plaats van één lange scroll.

## Wat je gaat zien

- Vier regels: Ontbijt, Lunch, Tussendoor, Diner. Elke regel toont de naam, hoeveel je daar gekozen hebt (bijv. "2 gekozen") en een pijltje.
- Tikken op een regel klapt die categorie open met de gerechten in het huidige raster; opnieuw tikken klapt hem dicht. Meerdere categorieën kunnen tegelijk open staan.
- Bij het openen begint elke categorie met een klein aantal gerechten (4). Onderin die categorie staat "Meer laten zien", dat alleen binnen die categorie extra gerechten bijlaadt.
- Bij binnenkomst staat Ontbijt open en de rest dicht, zodat je meteen ziet hoe het werkt.
- De ene knop "Meer laten zien" onderaan de hele pagina verdwijnt.
- Bovenaan blijft de titel en de teller met het totaal gekozen; de knop "Maak mijn lijst" blijft onderaan meeplakken.

## Technische aanpak

- Alleen `src/routes/_authenticated/dieta.interview.tsx` en (indien nodig) `src/components/diet/WeekMenuGrid.tsx` wijzigen; geen nieuwe afhankelijkheden.
- `round` (globaal) vervangen door per-slot state: `openSlots: Record<MealSlot, boolean>` en `rounds: Record<MealSlot, number>`.
- De suggestie-memo blijft `rankMeals` gebruiken, maar het aantal per categorie wordt `4 + rounds[slot] * 4`; dedupe blijft over categorieën heen, in de vaste orde ontbijt → lunch → tussendoor → diner.
- Uitklappen met de bestaande `Collapsible` uit `@/components/ui/collapsible` (zelfde patroon als elders in de app), chevron uit lucide.
- Nieuwe teksten ("{n} gekozen") toevoegen aan `src/lib/i18n/dict/round31.ts` (en/pt/nl); bestaande sleutels hergebruiken waar mogelijk.
- Afsluiten met Prettier, `bunx tsgo --noEmit`, buildcheck en een visuele controle van `/dieta/interview`.
