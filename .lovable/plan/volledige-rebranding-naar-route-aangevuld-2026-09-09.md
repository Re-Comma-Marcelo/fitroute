# Volledige rebranding naar ROUTE (aangevuld)

## Doelstelling

Vervang de identiteit Iron Logger/Forja volledig door ROUTE in de gehele interface, met behoud van de huidige flows en regels. Het resultaat moet helder, warm, industrieel en links uitgelijnd zijn, met de oxide-signatuur "the stop" systematisch toegepast en zonder visuele restanten van de eerdere donkere identiteit.

## 1. Visuele basis en merk

**Exacte tokens (ontbrak in het vorige plan — zonder deze waarden interpreteert Lovable de kleuren zelf):**


| Token                | Hex       | Ink-variant (op donkere ondergrond) |
| -------------------- | --------- | ----------------------------------- |
| `--color-bone`       | `#EFEBE4` | —                                   |
| `--color-ink`        | `#16151A` | —                                   |
| `--color-stone`      | `#E2DDD4` | —                                   |
| `--color-stone-line` | `#B4AFA6` | —                                   |
| `--color-violet`     | `#4B2FBF` | `#8B6CF0`                           |
| `--color-oxide`      | `#B44A26` | `#D9612F`                           |
| `--color-steel`      | `#2C4A6E` | —                                   |


- Contrast (voor validatie in stap 6): ink op bone 15.8:1, violet op bone 8.9:1, oxide op bone 4.7:1 (grens van AA — gebruik oxide daarom nooit als kleine tekstkleur, alleen als vlak/stop), steel op bone 8.2:1.
- **Kleurverhouding per scherm (nieuw — ontbrak volledig):** richt op ongeveer 62% bone, 16% stone, 12% ink, 6% violet, 2,5% oxide, 1,5% steel. Dit is de regel die oxide en violet schaars en dus betekenisvol houdt — voeg een lint-achtige controle of designreview-check toe die hierop let, niet alleen op afwezigheid van oude kleuren.
- Vervang de globale tokens door bone, ink, stone, stone-line, violet, oxide en steel, inclusief interactiestatussen (hover/pressed/disabled) en de ink-varianten hierboven.
- Maak light mode de standaard voor de applicatie en verwijder gradients, glows, schaduwen, oude kleuren en dark-mode-regels die conflicteren met ROUTE.
- Laad Archivo Variable en Chivo in het document.

**Typografische schaal (ontbrak in pixels/waarden — het vorige plan noemde alleen categorieën):**


| Niveau  | Grootte | Stijl                                                                                                    |
| ------- | ------- | -------------------------------------------------------------------------------------------------------- |
| Display | ~56px   | Archivo 800, font-stretch 112–125%, uppercase, letter-spacing −0.015 tot −0.02em. **Max. 1 per scherm.** |
| Title   | ~32px   | Archivo 700, dezelfde stretch/uppercase-regels. Schermtitels.                                            |
| Body    | ~17px   | Chivo 300. Regel nooit langer dan ~62 tekens — wrap eerder.                                              |
| Data    | ~20px   | Chivo 400, tabulair, rechts uitgelijnd, kleur steel.                                                     |
| Label   | ~13px   | Chivo 700 uppercase, letter-spacing ~0.26em.                                                             |
| Caption | ~12px   | Chivo 300.                                                                                               |


- Standaardiseer een maximale radius van 8px, schermmarges van 24px, een grid van 12 kolommen en flush-left-uitlijning (nooit gecentreerd, ook niet voor titels).
- Vervang alle animatiecurves door de vlakke curve `cubic-bezier(.2, 0, .2, 1)`; verwijder bounce, overshoot, pulse, glow en celebraties. Respecteer `prefers-reduced-motion`.
- Maak herbruikbare primitives voor:
  - `Stop`, met een exacte verhouding van 2× de lijndikte (14px regel → 28px stop, 6px → 12px, 2px → 4px);
  - regels van 14px, 6px en 2px met één enkele terminal stop;
  - een discreet hoekmarkeringselement zonder duplicatie (rechtsboven op een scherm/kaart, hoogstens 1×);
  - status `active` (violet), `attention` (oxide) en `neutral` (steel).
- **Expliciete verbodsregels voor de** `Stop`**-primitive (ontbrak):** nooit geroteerd, nooit met outline, nooit afgerond, nooit in violet/steel/ink (altijd oxide/oxide-licht), nooit los van het element dat hij afsluit, nooit twee keer op hetzelfde object.
- Maak alle vijf ROUTE-lockups, niet alleen de drie primaire:
  1. **Gestapeld** (default) — lijn + wordmark, lijn eindigt in de stop.
  2. **Horizontaal** — voor smalle headers/navbars.
  3. **Icoon op ink** — lijn in violet-licht (#8B6CF0), stop in #D9612F, op ink-achtergrond. Dit is de app-icoon/favicon-behandeling.
  4. **Full stop (in tekst)** *(ontbrak)* — wordmark direct gevolgd door een los oxide-vierkantje, als een letterlijke punt, voor gebruik in lopende tekst, footers of credits.
  5. **Stopped rule (covers/mastheads)** *(ontbrak)* — wordmark op zijn eigen 14px-regel die zelf in de stop eindigt; voor splash/onboarding-covers, niet voor de primaire in-app-lockup.
- Werk favicon, PWA-iconen, manifest, theme-color, titels, metadata en geïnstalleerde naam bij naar lockup 3.
- Behoud oude interne opslagkeys en backupcompatibiliteit wanneer het hernoemen ervan bestaande data in gevaar zou brengen; alleen de presentatie verandert naar ROUTE.

## 2. Gedeelde componenten

- Bouw de basiscomponenten opnieuw op vóór de schermen: Button, Card, Badge/Tag, Input, Textarea, Select, Checkbox, Radio, Switch, Slider, Tabs, Progress, Dialog, AlertDialog, Sheet/Drawer, Popover, menus, Toast, Skeleton, Table en focus states.
- Knoppen:
  - primary: effen violet (#4B2FBF), tekst bone;
  - secondary: transparant met een ink-rand van 3–4px;
  - tertiary: zonder achtergrond/rand en tekst in stone-line;
  - labels in Archivo uppercase, letter-spacing ~0.2em, radius van 8px.
  - **Regel (ontbrak):** per scherm is er hoogstens één effen violet primary-knop zichtbaar — dat is "het ene violette object op het scherm." Overige acties worden secondary/tertiary.
- Cards/panels: vlak stone, zonder rand en zonder schaduw. Waar een box niet nodig is, vervangen door een regel en een redactionele lijst.
- Tags: kleine rechthoeken (kleine radius, nooit pills), uppercase Chivo 700, uitsluitend violet/oxide/steel volgens betekenis (zie sectie 3) — nooit een vierde kleur voor een tag.
- Migreer zichtbare controls die momenteel ruwe `<button>`-elementen gebruiken naar de gedeelde Button of een passende semantische variant, zonder gedrag te wijzigen.
- Maak een icon wrapper met uitsluitend de formaten 20/24/32px, stroke 2.4px, vierkante caps/joins en een oxide stop gekoppeld aan het visuele terminus (ca. 5px vierkant op de 2.4px lijn — dezelfde 2×-logica als de algemene stop). **Verbodsregels voor iconen (ontbrak):** geen fills, geen duotone, geen kleur behalve de oxide-terminus; een icoon benoemt een functie, het draagt nooit een stemming. Behoud externe merken, zoals het Google-symbool, zonder aanpassing.
- Werk de onderste navigatie, headers, mini-player, timer, modals en sheets bij naar hetzelfde systeem.

## 3. Data, grafieken en route

- Maak steel de standaardkleur voor getallen, metingen en historie; behoud tabulaire waarden en rechts uitgelijnde data in lijsten.
- Pas de vaste statuswoordenschat toe — met concrete toepassing per schermtype (ontbrak in het vorige plan, was te generiek):
  - **violet** — actief, volgens plan, sessie voltooid zoals voorzien;
  - **oxide** — echte aandacht: macro over/onder target, gemiste sessie, vertraging t.o.v. schema, plateau gesignaleerd, afgekeurde/withdrawn set;
  - **steel** — neutrale, gemeten of historische data zonder oordeel (gelogde sets, trendlijnen zonder afwijking).
  - Voeding: over/onder een macro-target → oxide-tekst/waarde; binnen target of gewoon "nog open vandaag" → steel.
  - Sessie-overzicht: voltooid-als-gepland → violette tag; gemist/achter → oxide tag; puur historisch gelogd zonder evaluatie → steel.
  - Route/Voortgang: trendlijn blijft steel; een specifiek gemarkeerd punt (plateau, terugval, PR) krijgt een oxide-marker, in dezelfde gewichtslogica als de stop maar functioneel apart van de lijn-eindpunt-stop.
- Verwijder kleuren per categorie, spiergroep en zone; gebruik tekst, groepering en hiërarchie voor deze verschillen — geen regenboog-systeem.
- Standaardiseer lijsten als label links + steel-waarde rechts + stone-line-scheiding van 3px.
- Bouw Recharts-grafieken, sparklines, ringen en de route opnieuw op met visueel niet-gladde lijnen (geen gestileerde vloeiende curves — de lijn toont de echte progressie inclusief terugvallen, nooit gladgestreken), vierkante caps en zonder generieke ronde punten.
- Maak één gedeeld grafiek-endpoint: oxide vierkant met 2× de lijndikte, uitsluitend op het meest recente/doelpunt.
- Animeer elke lijn één keer bij het laden gedurende ongeveer 900ms; de stop verschijnt pas aan het einde van de animatie, niet ervoor. Micro-interacties (knop, toggle, tab) animeren in ~200ms. Respecteer reduced motion.
- Herontwerp `RoutePath` en `RoutePreviewCard` zodat ze dezelfde geometrie en visuele grammatica delen als het ROUTE-logo (zelfde lijndikte-conventies, zelfde stop-logica).

## 4. Handmatige doorgang door alle schermen

Pas het nieuwe systeem toe zonder productregels of data te wijzigen in:

- Login en accountaanmaak.
- Home, training van vandaag, routestatus, coach notes, voedingssamenvatting en empty states.
- Training, bibliotheek, zoeken en routine-editor.
- Actieve sessie: oefenbalk, drag-and-drop, sets, gewicht/reps, RPE, timer, notities en coach.
- Voeding: geplande/gegeten maaltijden, macro's, tijden, swaps, hydratatie, week en boodschappen.
- Mijn Route en Voortgang: checkpoints, details, vergelijkingen, records, historie en alle grafieken.
- Profiel, doelen, voorkeuren, integraties, backup en instellingen.
- Onboarding, interview/plan, Hevy-importeur en planreview.
- Samenvatting na de training, detailschermen, MCP/OAuth-authenticatie, fouten, loading en empty states.

Op elk scherm:

- verwijder ongepaste centrering, pills, geneste cards, decoratieve randen, schaduwen, gradients en oude kleuren;
- behoud een stabiele linkermarge van 24px en een 7/3/2-compositie op brede schermen;
- zorg voor maximaal één display title per scherm en maximaal één effen violette primary-knop per scherm (zie sectie 2);
- pas stops uitsluitend toe gekoppeld aan een regel, lijn, icoon of paneelhoek, nooit gedupliceerd, geroteerd, afgerond of zwevend;
- pas de statuskleuren (sectie 3) uitsluitend toe waar echt tegen een doel/plan wordt geëvalueerd — niet als algemene decoratie;
- controleer mobile en desktop om afsnijding, overlap en regressies in touch-interactie te voorkomen.

## 5. Volledige herschrijving van de tone of voice

- Hernoem alle zichtbare oppervlakken naar ROUTE: interface, SEO, PWA, consent, gedeelde exports en beschrijvingen die worden weergegeven in Claude/MCP.
- Herschrijf elke Engelse string naar een beheerste, precieze, korte en niet-motiverende stem.
- Verwijder "streak", celebratietaal, hype, excuses, "journey", "Let's", uitroeptekens en decoratieve emoji's.
- Standaardiseer berichten in de volgorde: feit → betekenis → volgende stap.
- Gebruik directe werkwoorden in CTA's: "Begin session", "Adjust", "Skip today".
- De app noemt zichzelf ROUTE, nooit "we" of "I" — tweede persoon, actieve vorm.
- Werk voor elke gewijzigde Engelse sleutel tegelijkertijd de Portugese en Nederlandse vertalingen bij.
- Maak een pariteitscontrole voor de woordenboeken om orphan keys of onbedoelde fallback naar Engels te voorkomen.

## 6. Verificatie en afrondingscriteria

- Geautomatiseerd zoeken moet nul resultaten opleveren voor: de vijf oude kleuren, zichtbare Inter/Poppins, gradients, decoratieve schaduwen, pills in controls/tags, looping-animaties, zichtbare namen Iron Logger/Forja.
- **Extra checks (ontbraken):**
  - geen oxide-gebruik als knop-fill of grote bannervlakking (oxide mag alleen als stop of als klein status-vlak/tekst voorkomen);
  - geen scherm met twee of meer stops op hetzelfde element, of een stop die geroteerd/afgerond/omlijnd is;
  - geen scherm met meer dan één display-title of meer dan één effen violette primary-knop;
  - bodytekst-regels niet significant langer dan ~62 tekens op desktopbreedte;
  - kleurverhouding per scherm blijft ruwweg binnen de 62/16/12/6/2,5/1,5-richtlijn (steekproefsgewijze visuele review, geen harde lint-regel nodig).
- Valideer dat geen enkel element twee stops ontvangt en dat oxide beperkt blijft tot stop of attention-status.
- Controleer alle bestaande navigatiepaden en acties zonder backend, Supabase, data of functionele regels te wijzigen.
- Valideer build, types en relevante tests.
- Voer visuele inspectie met Playwright uit op de belangrijkste schermen in mobile en desktop, waaronder login, Home, sessie, Voeding, Route/Voortgang, Profiel en Onboarding.
- Controleer contrast (met name oxide op bone: 4.7:1 — alleen geschikt voor grote/vlak-elementen, niet voor kleine tekst), toetsenbordfocus, touch targets, lange teksten in alle drie talen, PWA safe areas en installeerbare iconen.

## Technische details

- De huidige inventarisatie vond 172 keer `rounded-full`, 46 keer schaduw, 12 gradients, 145 ruwe knoppen en 58 verwijzingen naar het oude merk. Deze worden eerst via gedeelde componenten aangepakt en daarna via een handmatige audit.
- De vertaalarchitectuur gebruikt de Engelse zin als sleutel. Elke herschrijving wordt atomair uitgevoerd op het gebruikspunt en in de Portugese/Nederlandse woordenboeken om vertalingen niet te breken.
- Het Google Mark behoudt zijn officiële kleuren; het is een extern merk en geen onderdeel van het functionele ROUTE-palet.
- Interne keys zoals lokale opslag en backupidentifiers blijven behouden wanneer nodig voor compatibiliteit, ook als ze oude namen bevatten; ze zijn niet zichtbaar voor de gebruiker.