# Oefeningen slepen in plaats van pijlen

Alleen frontend in `src/routes/_authenticated/sessao.tsx`. Geen wijzigingen aan Supabase, progressie of dataopslag.

## Weg

- De twee zichtbare pijlknoppen (omhoog/omlaag) naast elke oefeningskaart verdwijnen, samen met de ongebruikte `ArrowUp`/`ArrowDown` iconen daar. Dat geeft de kaartkop weer rust.
- "Omhoog" / "Omlaag" / "Doe deze als laatste" blijven in het drie-puntjes-menu staan als toegankelijk alternatief (ook voor toetsenbord/screenreader).

## Erbij: slepen met ingedrukt houden

- Elke oefeningskaart krijgt een kleine greep (grip-icoon, 44px raakvlak) links in de kop, op de plek waar nu de naam begint.
- Lang indrukken (~250 ms) op de greep activeert sleepmodus: lichte haptische tik, kaart komt iets omhoog (schaal + hogere z-index, rest van de lijst dimt licht).
- Tijdens het slepen met de vinger schuiven de andere kaarten weg en verschijnt een plaatsindicator; bij lossen valt de oefening op de nieuwe positie.
- Losser laten zonder te bewegen = niets gebeurt. Scrollen blijft normaal werken zolang de sleep niet actief is (touch-scroll wordt alleen geblokkeerd tijdens een actieve sleep).
- Tijdens het slepen wordt de kaart samengevouwen weergegeven (naam + aantal series), zodat de lijst hanteerbaar blijft.

## Technische details

- Implementatie met pointer events (`onPointerDown` + `setPointerCapture`) op de greep, plus een long-press timer; geen nieuwe dependency nodig, dus geen dnd-kit installatie.
- Volgorde wordt bepaald door de y-positie van kaarten (`getBoundingClientRect`) en toegepast via de bestaande array-verplaatsing, zodat `session.atual` (huidige oefening) meeschuift zoals nu al in `moveExercise` gebeurt.
- `moveExercise` blijft de enige plek die de volgorde muteert; de sleep roept die logica aan met een van/naar-index.
- `touch-action: none` alleen op de greep en tijdens actieve sleep, zodat verticaal scrollen elders intact blijft.
- Nieuwe UI-strings ("Sleep om de volgorde te wijzigen") in het bestaande i18n-woordenboek (en/pt/nl).
- Verificatie met Playwright op 393x840: sleep een oefening van positie 1 naar 3 en controleer dat de nieuwe volgorde blijft staan na het lossen.
