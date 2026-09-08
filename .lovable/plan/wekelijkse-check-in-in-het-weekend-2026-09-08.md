# Wekelijkse check-in in het weekend

De app vraagt nu nooit om je weekplanning. Er bestaat alleen een check-in als je een paar dagen niet getraind hebt. Dit voegt een echte weekstart-check-in toe.

## Wanneer

- Zichtbaar vanaf zondag. Open je de app zondag niet, dan verschijnt hij maandag.
- Verdwijnt zodra je de week hebt gepland, en komt de week erna weer terug.
- Ook een melding op je telefoon in het weekend, via hetzelfde herinneringssysteem als de trainingsherinnering (aan/uit bij Profiel).

## Wat de check-in vraagt

Vier korte stappen, één kaart bovenaan het startscherm:

1. Hoe ging vorige week? Korte terugblik met je eigen cijfers (sessies, volume, streak) plus een gevoel-keuze: sterk / oké / zwaar.
2. wat is je planning deze week? school, werk, vrije tijd, vrienden afspreken etc.
3. Welke dagen kun je deze week trainen? Dagen aantikken (ma–zo).
4. Blessures of vermoeidheid? Optionele korte tekst plus snelkeuzes (schouder, rug, knie, algeheel moe, niets).
5. Hoeveel weeg je vandaag? Optioneel getal, wordt bij je gewichtsgeschiedenis opgeslagen.

Daarna een samenvatting: welk weekdoel is gezet, welke routines op welke dagen staan, en één coachopmerking die verwijst naar wat je invulde ("schouder gevoelig — bovenlichaam lichter beginnen").

## Wat het verandert in de app

- Je weekdoel (aantal sessies) wordt gelijk aan het aantal gekozen dagen.
- De gekozen dagen worden verdeeld over je bestaande routines, zodat het startscherm en Training de juiste sessie per dag voorstellen.
- Genoemde blessures gaan naar de coachnotities, waardoor de bestaande "vermijd/pas aan"-logica ze meeneemt.
- Het gewicht komt in je gewichtsverloop bij Voortgang.
- Alles is terug te lezen in de coachnotities-lijst.

## Technische aanpak

- Nieuw `src/lib/coach/weekly-checkin.ts`: weeksleutel (ISO-week), "is de check-in nu verschuldigd" (zondag/maandag, nog niet ingevuld deze week), opslag van antwoorden in localStorage plus een `coaching_events`-record.
- `CoachingEventKind` uitbreiden met `weekly_checkin` (types + bestaande labels in `CoachNotesCard`); geen databasewijziging nodig — de bestaande tolerante schrijf-fallback blijft gelden.
- Nieuw `src/components/WeeklyCheckInCard.tsx`: de vier stappen, gerenderd boven `CoachNotesCard` in `src/routes/_authenticated/inicio.tsx`.
- Toepassen van antwoorden: weekdoel via `profile.metaTreinosSemana`, dagen via `diasSemana` op routines (`src/lib/data/routines.ts`), gewicht via `src/lib/data/body-weight.ts`, blessure-notitie via `saveCoachNote`.
- Melding: `src/lib/workout-reminder.ts` uitbreiden met een weekend-check-in-melding op hetzelfde geplande tijdstip, één keer per week (eigen fired-key).
- Nieuwe teksten in een nieuw woordenboekbestand onder `src/lib/i18n/dict/` (Engels, Portugees, Nederlands).
- Geen Supabase-migratie, geen backend-werk.