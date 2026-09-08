# Eén duidelijke start, één route, en de app doet het werk

Je hebt drie problemen die met elkaar te maken hebben: (1) de database mist tabellen/kolommen, waardoor dieet en route half werken, (2) er is geen echte eerste-keer-ervaring, dus je moet alles zelf blijven instellen, en (3) de route wordt nu door jou gemaakt in plaats van door de app. Dit plan pakt ze in die volgorde aan.

## Deel 1 — Wat je in Supabase moet doen (eenmalig)

Open de SQL-editor van je eigen Supabase-project en voer deze bestanden uit, in deze volgorde. Alles is veilig om opnieuw te draaien.

```text
1. scripts/supabase-schema.sql              basis: profiel, oefeningen, routines,
                                            workouts, sets, coach-notities, maaltijdplan,
                                            maaltijdtijden, eigen maaltijden, boodschappen
2. scripts/supabase-seed.sql                 80 oefeningen + voorbeeldroutines
3. scripts/supabase-migration-coaching.sql   coach-gebeurtenissen, cross-training, coach-chat
4. scripts/supabase-migration-body-weight.sql gewichtslogboek + weekindeling van routines
5. scripts/supabase-migration-route.sql      checkpoints + voortgangsfoto's van je route
```

Klik daarna op "Reload schema cache". Dit lost concreet op:

- "Could not find the table 'public.custom_meals'" → eigen maaltijden toevoegen en wisselen werkt echt en blijft bewaard op al je toestellen (nu alleen op dit toestel).
- "Could not find the table 'public.coaching_events'" → de coach onthoudt wat hij eerder tegen je zei.
- Route-checkpoints en foto's worden bewaard in plaats van alleen lokaal.
- Streefdatum en streefgewicht verhuizen van dit toestel naar je account.

Er is één ontbrekend stuk dat ik erbij maak: een klein migratiebestand voor de nieuwe velden die de eerste-keer-interview oplevert (dagelijkse calorieën, proteïnedoel, voedselvoorkeuren en -afkeuren, gemiddelde week). Dat wordt `scripts/supabase-migration-intake.sql`, met dezelfde stijl: kolommen op `profiles` plus één tabel voor voedselvoorkeuren.

Zolang je iets niet gedraaid hebt blijft de app werken (lokaal opslaan), maar dan mis je synchronisatie.

## Deel 2 — De eerste-keer-journey (het belangrijkste onderdeel)

Nu zijn er drie losse startpunten: een korte onboarding, een "Get a plan"-kaart en een aparte doelinstelling. Die worden één gesprek dat één keer plaatsvindt, direct na je eerste inlog, en dat je nooit opnieuw hoeft te doen (wel opnieuw te openen via Profiel).

Het gesprek in vijf stappen, waarbij de app na elke stap terugpraat met een conclusie:

1. **Wie ben je** — lengte, gewicht, leeftijd, geslacht, ervaring.
2. **Je doel** — bijvoorbeeld "meer spier opbouwen". De app antwoordt meteen met wat dat betekent: "Dan eet je boven je verbruik: ~3.400 kcal en 165 g proteïne per dag. Een realistisch doel is 76 kg over 3 maanden." Daaronder twee knoppen: *Klopt, ga door* en *Nee, ik wil dit anders* (dan pas je gewicht of datum aan en herrekent de app).
3. **Je gemiddelde week** — welke dagen kun je trainen, hoe lang, ochtend/avond, ander sport, werk/gezin. Met de uitleg: we vragen elke week naar je weekplanning, maar hiermee weten we je normaal.
4. **Je voeding** — wat je lekker vindt, wat je nooit eet, allergieën, hoeveel tijd je hebt om te koken, hoeveel maaltijden per dag en op welke tijden.
5. **Klaar** — de app bouwt in één keer: je trainingsroutines voor de week, je maaltijdplan met slots en macro's, je streefdatum, en je route met checkpoints.

Daarna land je op de home met alles al ingevuld. Je hoeft alleen nog te loggen.

## Deel 3 — De route plant de app, niet jij

- Checkpoints worden automatisch gezet zodra de intake klaar is; jij hoeft niets te "uitzetten". Handmatig toevoegen/aanpassen blijft kunnen, maar is optioneel.
- Elke dag herberekent de app of je op schema ligt (trainingen, gewicht, sleutel-lifts, voeding) en zet dat bovenaan Mijn route en als één regel op de home: op schema / iets achter / voor op schema, met de reden.
- Wijk je af, dan past de app zelf aan (minder volume, meer calorieën, datum verschuiven) en vertelt wát hij aanpaste — jij hoeft alleen te bevestigen.
- De weekcheck-in vult de route bij in plaats van los te staan.
- Mijn route houdt twee tabbladen: Route en Progressie (ongewijzigde inhoud).

## Deel 4 — Rustiger beeld

- Home: één regel routestatus, de training van vandaag, drie cijfers, dieet-samenvatting. Kaarten zonder inhoud verdwijnen in plaats van leeg te staan.
- Grotere tekst voor de belangrijke cijfers, kleine tekst alleen voor uitleg.
- Geen dubbele instelknoppen meer: doel, week en voeding wonen op één plek in Profiel.

## Technische aanpak

- Nieuw: `src/lib/intake/` (schema, prompt, toepassen) dat de bestaande `src/lib/plan/`-gateway en `applyPlan` hergebruikt; `src/routes/_authenticated/onboarding.tsx` wordt de vijf-stappen-flow en `plano.tsx` wordt daarnaar doorverwezen, zodat er geen dode schermen achterblijven.
- Rekenmodel voor kcal/proteïne/realistische datum deterministisch in `src/lib/intake/targets.ts` (Mifflin-St Jeor + activiteit + doelmarge), zodat de AI alleen tekst en keuzes doet, geen getallen verzint.
- Intake-status in `profiles` (`intake_completed_at`), met lokale fallback zolang de migratie niet gedraaid is.
- Route: `generateCheckpoints` wordt aan het eind van de intake aangeroepen; dagelijkse status via bestaande `src/lib/route/status.ts`, uitgebreid met voedings- en gewichtssignalen.
- Voedselvoorkeuren voeden `nutrition-swap.ts`, zodat maaltijdwissels je afkeuren respecteren.
- Geen wijziging aan Supabase vanuit de app: alle SQL blijft een bestand dat jij draait.
