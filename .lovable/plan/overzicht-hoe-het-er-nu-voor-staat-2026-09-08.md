# Overzicht: hoe het er nu voor staat

Geen wijziging aan de eerste-keer-journey in dit plan — dit is eerst de stand van zaken, plus de kleine reparaties die nodig zijn om het bestaande werkend te krijgen.

## 1. De start van de app zoals hij nu is

Er zijn nu **twee losse startpunten**, en dat is precies waarom het onoverzichtelijk voelt.

**A. De intro (1 minuut, verplicht bij een nieuw account)**
Je landt na inloggen op de home; heb je nog geen enkele afgeronde training, dan word je één keer automatisch doorgestuurd naar de intro. Die intro vraagt:

1. een welkomstscherm met voorbeelddashboard
2. keuze: zelf beginnen of je Hevy-geschiedenis importeren
3. je doel
4. hoeveel keer per week je traint
5. je ervaringsniveau

Daarna bouwt hij één starter-routine (puur op regels, geen AI, geen voeding, geen doelgewicht, geen datum, geen route). Je kunt hem later opnieuw doorlopen via Profiel → "Onboarding opnieuw bekijken".

**B. "Get a plan" (het echte interview, maar optioneel en verstopt)**
Los daarvan bestaat er een uitgebreid interview van vijf stappen: Jij → Doel → Training → Je leven & tijd → Voeding. Dit is het interview dat je bedoelt: hier zit doelbevestiging in, je week, je beschikbare tijd en je voedselvoorkeuren, en het resultaat komt van de AI. Bij activeren schrijft het echt in de app: het maakt je trainingsroutines aan én vult je maaltijdplan voor de rest van de week.

**Het probleem:** de verplichte intro is de zwakke versie, en de sterke versie moet je zelf gaan zoeken. Daardoor moet je later alsnog je doel, streefdatum en dieet handmatig instellen.

## 2. Wat er in Supabase mist (en waarom je dieet vastloopt)

De app verwacht meer tabellen dan er in je project staan. Voer in de SQL-editor van je eigen Supabase-project uit, in deze volgorde, en klik daarna op "Reload schema cache":

```text
1. scripts/supabase-schema.sql               profiel, oefeningen, routines, workouts,
                                             sets, coach-notities, maaltijdplan,
                                             maaltijdtijden, eigen maaltijden, boodschappen
2. scripts/supabase-seed.sql                 80 oefeningen + voorbeeldroutines
3. scripts/supabase-migration-coaching.sql   coach-gebeurtenissen, cross-training, coach-chat
4. scripts/supabase-migration-body-weight.sql gewichtslogboek + weekindeling routines
5. scripts/supabase-migration-route.sql      route-checkpoints + voortgangsfoto's
```

Wat dit oplost:

- **Dieet:** `custom_meals` bestaat nu niet, daardoor mislukte het toevoegen van eigen maaltijden en werken maaltijdwissels maar half. Nu valt hij terug op dit toestel; na stap 1 wordt het echt bewaard.
- **Coach:** `coaching_events` ontbreekt, dus de coach onthoudt niets tussen sessies.
- **Route:** checkpoints en foto's staan alleen lokaal; na stap 5 horen ze bij je account.
- **Doel:** streefdatum en streefgewicht staan nu op dit toestel; na stap 4 in je profiel.

De app blijft zonder deze stappen werken, maar dan lokaal en zonder geheugen — en dat is exact het gedrag dat je nu ervaart.

## 3. De route zoals hij nu is

De route bestaat, met een Route-tab en een Progressie-tab. Maar: hij vraagt jou om een streefdatum en om zelf "Zet mijn route uit" te drukken, en checkpoints kun je zelf toevoegen. Dat is nog niet "de app plant het voor je". De dagelijkse op-schema/afwijking-melding is er ook nog niet als vaste regel op de home.

## 4. Wat ik voorstel om nú te doen (klein, geen herontwerp)

1. Jij draait de vijf SQL-bestanden hierboven; ik verander daar niets aan.
2. Ik laat de verplichte intro doorlopen naar het bestaande vijf-stappen-interview in plaats van naar de zwakke starter-routine, zodat er één journey is en geen tweede verstopte.
3. Ik laat de route zichzelf uitzetten zodra dat interview klaar is (streefdatum inbegrepen), zodat jij niets meer hoeft te drukken.
4. Ik voeg één vaste routestatus-regel toe bovenaan de home: op schema / iets achter / voor.

Meer verander ik niet totdat je zegt dat je verder wilt.

## Technische aanpak

- `src/routes/_authenticated/onboarding.tsx` houdt zijn welkomst- en importstap, maar stuurt daarna door naar `/plano` (het bestaande interview) in plaats van naar `buildStarterPlan`; de starter-routine blijft als noodoplossing voor "overslaan".
- Na `applyPlan` in `src/lib/plan/apply.ts` volgt een aanroep van `generateCheckpoints`, zodat de route direct staat; `metaPrazo` wordt uit de doelstap gezet in plaats van uit het losse doelblok.
- Homestatusregel via bestaande `src/lib/route/status.ts`, één regel boven de kaart van vandaag.
- Geen SQL-uitvoer vanuit de app: de migratiebestanden blijven bestanden die jij draait.
