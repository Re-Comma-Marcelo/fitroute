# Adaptieve coach: afmaken wat nog ontbreekt

## Wat er al staat (gecontroleerd in de code)

- Feature 1 — prestatiedaling met context: `src/lib/coach/performance-drop.ts` (cross-training in 48u, set-notitie, patroon over 3 sessies, one-off).
- Feature 2 — inactiviteit + check-in: `src/lib/coach/inactivity.ts` + antwoordveld in de Coach Notes-kaart op Home (`inicio.tsx`).
- Feature 3 — herstelbericht na de sessie: `src/lib/coach/post-workout.ts` (intensiteit vs. recent gemiddelde + open macro's van vandaag).
- Feature 4 — "Note for coach" per set: `workout_sets.coach_note` + veld onder de gelogde set in `sessao.tsx`.
- Feature 5 — chat tijdens de training met oefening-swap: `SessionCoachSheet.tsx` + `src/lib/coach/swap.ts`.
- Feature 6 — coach-tip staat boven de sets, niet eronder.
- Opslag van elke detectie: `scripts/supabase-migration-coaching.sql` (`coaching_events`, `cross_training_logs`, `coach_chat_messages`) met localStorage-fallback.

## Wat nog ontbreekt

1. De migratie is nog niet uitgevoerd in jouw Supabase. Daardoor slaat de app coaching-events, cross-training en chat alleen lokaal op (het "table not found in schema cache"-pad).
2. Alle coachteksten komen uit lokale regels/templates, niet uit een echte AI-call. De rijke context uit jouw briefing (laatste 5–10 sets, cross-training van 3 dagen, resterende macro's, ongelezen set-notities, dedication level) wordt nog niet naar het model gestuurd.

## Voorstel

### Stap 1 — Migratie afronden
Je voert `scripts/supabase-migration-coaching.sql` één keer uit in de SQL-editor van je Supabase-project. Daarna schakelt de app automatisch over van lokale opslag naar echte persistentie; er is geen codewijziging nodig.

### Stap 2 — Echte AI-laag achter de coach
- Nieuw `src/lib/coach/context.server.ts`: bouwt één contextpakket (laatste 10 sets van de betrokken oefening, cross-training van 3 dagen, open macro's van vandaag, ongelezen `coach_note`-teksten sinds het laatste event, dedication level uit onboarding).
- Nieuwe server function `src/lib/coach-ai.functions.ts` met vier ingangen: `performance_drop`, `inactivity_checkin`, `post_workout`, `chat`. Draait via de bestaande `src/lib/plan/gateway.server.ts`, dus de key blijft server-side.
- Systeemprompt met de merkstem: direct, menselijk, bevestigend, oplossingsgericht; geen schuldgevoel, geen hype; 2–3 zinnen; één concreet voorstel, niet twee.
- De bestaande regels blijven de trigger en de fallback: detectie gebeurt lokaal, de AI schrijft de tekst. Valt de call weg (offline, 402/429), dan blijft het huidige templatebericht staan.
- Chat in de sessie: het model mag een swap voorstellen uit de kandidaten van `swap.ts`; jij accepteert, de app wisselt de oefening in de actieve sessie.

## Technische details

- Alle nieuwe calls lopen via `createServerFn`; niets vanuit de browser.
- `coaching_events.detail` bewaart het verstuurde contextpakket in verkorte vorm, zodat de coach later naar patronen kan verwijzen.
- Geen wijziging aan het schema behalve de bestaande migratie; geen nieuwe tabellen.
- Nieuwe strings gaan in een i18n-fragment (EN/PT/NL), zoals de rest van de app.
