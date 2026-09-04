# Dieet opschonen + slimmer en overzichtelijker trainen

Deel 1 van de dieetronde (eigen maaltijden opslaan) wordt **uitgesteld** tot je weer bij Supabase kunt. De rest gaat nu door.

## A. Dieet: punten 2 t/m 5 afmaken

1. **Knop-in-knop in de maaltijdkaart** — de favoriet-knop zit nu binnen de grote maaltijd-knop. Dat is ongeldige HTML en geeft onbetrouwbare taps. De kaart wordt een container met aparte tap-zones voor selecteren, favoriet en "gegeten". Tap-doelen blijven 44px.
2. **Favorieten reageren direct** — in de maaltijdkiezer staan favorieten nu pas bij heropenen goed. Favorieten komen in lokale state en updaten meteen.
3. **Hydratatie zonder browser-prompt** — het waterdoel stel je in met −/+ in de kaart zelf (4–16 glazen).
4. **Coach-inzicht + repeat-yesterday netjes** — de nieuwe voedingsteksten gaan door de i18n-woordenboeken (EN/PT/NL), "repeat yesterday" vult alleen lege slots met undo-toast, en de macro-ringen krijgen een klein label "Planned" / "Eaten".

## B. Trainen: rustdagen in plaats van elke dag een advies

Nu krijg je elke dag een aanbevolen training. De coach gaat je weekdoel (4–5x) echt gebruiken:
- Bij een gehaald weekdoel of te weinig rust tussen dezelfde spiergroepen wordt de aanbeveling een expliciete **rustdag-kaart**: waarom vandaag rust, wat de week nog laat zien, en een "toch trainen"-knop die de rustdag overslaat.
- De verdeling wordt gepland over de week: bij 4x per week wisselt de coach trainingsdagen en rustdagen af op basis van je gelogde sessies, niet van de kalenderdag.

## C. Trainen: overzichtelijker loggen

De setregel blijft één regel, maar de opbouw wordt rustiger:
- Vaste kolombreedtes zodat KG/REPS in elke regel uitlijnen; grijze "vorige"-waarde compacter en zwakker.
- Kopregel boven de sets (SET · VORIGE · KG · REPS · PSE) één keer per oefening in plaats van los rondslingerende labels.
- Per oefening een compacte kop: naam, doel-reeks, rusttijd en voortgangsbalkje; afgeronde oefeningen klappen automatisch dicht.

## D. Trainen: oefeningen makkelijker verplaatsen

Verplaatsen zit nu in een menu achter drie puntjes. Er komen zichtbare op/neer-pijlen op de oefeningkop, plus "naar achteren zetten" (verplaats naar het einde) voor precies jouw geval: de app zegt bench eerst, jij doet hem later. Hetzelfde in de routine-editor.

## E. Rusttimer bij het afvinken

De timer start technisch al bij het afvinken van een set. Waar het misgaat is als de rusttijd van die oefening op 0 staat of bij een superset. Fix: een gegarandeerde standaard (90s, per oefening instelbaar) zodat er altijd een timer loopt, en de rust-eiland toont direct de aftelling met −15/+15/skip.

## F. Trainen: de app bepaalt je doel per set

Geen zelfgestelde doelen meer. Per set berekent de app het werkgewicht uit je geschatte 1RM (Epley, uit je recente sets), je PSE-trend en de rep-range van de oefening, en vult dat vooraf in met een korte coach-regel in merkstem, bijvoorbeeld: "80kg x 10 — mag zwaar aanvoelen, maar die 10 moet je halen."
- Ging de vorige sessie makkelijk (PSE ≤ 8 en boven de rep-range): meer gewicht. Was het zwaar of miste je reps: gelijk houden of terug.
- De regel staat **boven** de sets, dus je leest het voor je begint.
- Je kunt altijd zelf overschrijven; de app leert van wat je echt logt.

## Technische details

- Dieet: `nutrition-ui.tsx`, `MealPickerSheet.tsx`, `HydrationCard.tsx`, `dieta.index.tsx`, `coach/nutrition.ts`, `data/nutrition.ts`, `i18n/dict/diet.ts`.
- Trainen: `coach/recommendations.ts` en `today-card.ts` (rustdagen), `sessao.tsx` (layout, verplaatsen, rust, doelregel), nieuw `src/lib/prescription.ts` voor de gewicht/reps-berekening bovenop `e1rm.ts` en `progression.ts`, plus `session-state.ts` voor het doel per set.
- Geen Supabase-wijziging, geen migratie; alles frontend. Afsluiten met typecheck en build.
- Uitgesteld tot je weer bij Supabase kunt: eigen maaltijden opslaan (`custom_meals`-migratie + lokale terugval).
