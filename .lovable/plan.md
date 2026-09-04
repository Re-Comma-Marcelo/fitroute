# Trainings- en dieetverbeteringen — 4 september

Alles frontend, behalve één ding: nieuwe oefeningen komen uit de Supabase-catalogus. Die krijg je als kant-en-klaar SQL-bestand dat je later één keer uitvoert wanneer je weer toegang hebt.

## 1. Loggen: vink af, timer loopt, volgende set krijgt een doel

- Vinkje aantikken blijft één tik: wat er staat wordt gelogd en de rusttimer start (dat werkt al zo).
- Nieuw: zodra een set is afgevinkt, berekent de app het doel voor de vólgende set uit wat je net deed (gewicht, reps, hoe zwaar het voelde) en zet dat als lichtgrijze suggestie in die regel: bijvoorbeeld "80 × 10". Het is een voorstel, geen ingevulde waarde.
- Aantikken van dat doel neemt het over; daarna pas je vrij aan hoeveel reps het écht werden.
- Boven de sets komt één korte regel van de coach met het waarom ("houd 80 kg vast, alle 10 reps halen").

## 2. Getallen gewoon kunnen typen

Nu opent het toetsenbord wel, maar de plus/min zit in een pop-up achter lang indrukken, wat verwarrend werkt. Verandering:
- Tikken op gewicht of reps zet direct de cursor klaar en selecteert de waarde, zodat je meteen kan typen.
- Plus/min blijven bestaan, maar als klein knopje naast het veld; ze duwen het typen niet meer weg.
- Enter springt naar het volgende veld (blijft).

## 3. Oefeningen alleen bij de spiergroep die ze primair trainen

De bibliotheek filtert nu ook op secundaire spieren, daarom staat Lat Pulldown ook onder onderarmen. Filter gaat op de primaire spiergroep. Secundaire spieren blijven wel zichtbaar in de detailweergave van de oefening.

## 4. Ontbrekende oefeningen toevoegen

Toevoegen aan de catalogus, waaronder: Preacher Curl, Seated Dumbbell Curl, Concentration Curl, Incline Dumbbell Curl, Spider Curl, Reverse Curl, Cable Curl, Chest-Supported Row, Meadows Row, Straight-Arm Pulldown, Pendlay Row, Hack Squat, Bulgarian Split Squat, Pendulum/Belt Squat, Nordic Curl, Cable Lateral Raise, Machine Lateral Raise, Reverse Pec Deck, Cable Overhead Triceps Extension, JM Press, Standing Calf Raise (machine), Hip Thrust, Cable Pull-through.

Elk met primaire spiergroep, materiaal en uitvoeringsinstructie in dezelfde stijl als de bestaande. Ze komen in het lokale catalogusbestand én in een nieuw SQL-bestand; jij voert dat SQL-bestand later uit zodat ze in je eigen database staan. Tot dat moment zie je ze nog niet in de app.

## 5. Dieet: gepland versus aanbevolen duidelijk scheiden

- De maaltijdlijst wordt in twee duidelijk gelabelde blokken gesplitst: "Jouw plan voor dit moment" bovenaan (met status gepland of gegeten) en daaronder "Aanbevolen" met een zichtbaar andere, rustiger stijl, zodat het nooit lijkt of iets al vaststaat.
- Elke kaart krijgt een klein statuslabel: Gepland / Gegeten / Aanbevolen.

## 6. Dieet: op de ringen tikken voor een opbouw

De macroringen worden aantikbaar en openen een overzicht met:
- per maaltijd van vandaag: wat gepland is, wat je al gegeten hebt, en de calorieën/eiwit/koolhydraten/vet die die maaltijd bijdraagt;
- subtotalen gegeten en gepland naast je dagdoel, met het verschil dat nog open staat;
- korte uitleg waar de dagdoelen zelf vandaan komen (jouw gewicht, doel en activiteit).

---

## Technische noten

- `sessao.tsx` / `session-state.ts`: na afvinken van een set de volgende openstaande set een `sugPeso`/`sugReps` geven via een nieuwe autoregulatie-helper naast `prescription.ts` (Epley-e1RM van de gelogde set, RPE-correctie, afronding op materiaalstap). Suggesties blijven placeholders, geen waarden.
- `StepperField` in `sessao.tsx`: long-press-popover eruit, `onFocus` select-all erin, compacte ±-knoppen naast het veld.
- `biblioteca.tsx` regel 67: filter op `grupoPrimario` in plaats van primair óf secundair.
- Nieuwe oefeningen in `src/lib/data/mocks.ts` plus `scripts/supabase-seed-exercises-2026-09.sql` met `on conflict do nothing`. Geen migratie via tooling; niets aan Supabase geraakt.
- `dieta.index.tsx` + `nutrition-ui.tsx`: gesecties lijst met statusbadges; nieuwe `MacroBreakdownSheet` die `plannedTotals`, `eatenFor`/`eatenTotalsFor` en de dagdoelen per maaltijd uitsplitst.
- Nieuwe strings in de i18n-woordenboeken (EN/PT/NL).
