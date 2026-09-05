# Rest timer: always visible, adjustable, and it reaches you

Goal: ticking a set always starts a visible countdown at the bottom of the workout screen, you can shape the length with one thumb, and the end of rest reaches you even with the phone locked in your pocket.

## 1. Find out why the countdown never shows up (first step)

The workout screen already contains the countdown bubble and it should start on every ticked set, so something is stopping it on your phone. This is not yet confirmed, so the first step is to check it rather than guess:

- Reproduce a real session in the browser and watch what happens on the tick: does the rest get stored, and does the bubble render but sit off-screen or behind the Finish bar?
- Check the two known cases where the app intentionally starts no rest: sets inside a superset block, and an exercise saved with a rest of zero.

Whatever the check shows gets fixed there, and the safeguards below make it hard for the bubble to go missing again:

- Never fall back to "no rest": if an exercise has no saved rest, use a sensible length from its rep range.
- Give the bubble its own safe spot above the Finish button, unaffected by page scrolling or the mini bar.
- Show it as soon as the tick lands, with a short slide-in so it's impossible to miss.

## 2. Bigger, clearer countdown with real length control

Reshape the bubble into a rest bar that is easy to hit while breathing hard:

- Big countdown, ring that drains, and the exercise name so you know whose rest it is.
- `-15` / `+15` that also adjust the ring (today taking time off leaves the ring wrong), with a floor of 10 seconds and a cap of 10 minutes.
- Quick presets: 60 / 90 / 120 / 180 seconds, one tap each.
- "Save as default for this exercise": whatever length you land on becomes that exercise's rest for the next sets and next sessions.
- Skip / dismiss stays where it is, and the overdue count-up ("+1:20") is kept.

## 3. Being reached when the rest ends

Three layers, strongest first, each degrading gracefully:

- **Phone notification.** Ask for permission the first time a rest actually starts, right there in the workout, with a one-line explanation and a "not now" that never asks again (today the switch is buried in Profile, so most people never turn it on). The notification carries a vibration pattern and an action to jump back into the session.
- **Live countdown on the lock screen (Android).** While resting, keep a notification that updates every few seconds with the time left, replaced by the "rest is over" alert at zero. iOS does not allow this, so there it simply shows the single end-of-rest notification.
- **Sound and vibration on screen.** Longer, stronger vibration pattern and a slightly more assertive beep at zero, plus the existing full-screen "rest is over" state. If the phone was asleep and the app catches up late, it fires immediately on return with the overdue count-up.

The end-of-rest alert is scheduled in the background worker instead of only inside the page, so a phone that freezes the tab still gets it. The Profile switch stays as the place to turn the notifications off again.

## Technical notes

- `src/routes/_authenticated/sessao.tsx`: verify/fix the `toggleSet` → `startRest` path, the `restFor` fallback, and the island's fixed positioning; add the "save as default" call into `setExerciseRest`.
- `src/components/RestIsland.tsx`: new layout (exercise name, presets, save-default), `-15` also decrements `total`, clamp 10s–600s.
- `src/lib/rest-notification.ts`: in-session permission prompt, `vibrate` pattern, notification actions, and delegate scheduling to the service worker with the current `setTimeout` as fallback.
- Service worker: switch the PWA plugin to `injectManifest` (or `importScripts` of a small extra script) so the worker can hold the rest deadline, post the ongoing Android notification, and `showNotification` at zero. App-shell caching behaviour stays unchanged, and the worker still never registers in preview/dev.
- `src/lib/haptics.ts` / `rest-audio.ts`: stronger end-of-rest pattern and beep.
- New strings added to a fresh i18n fragment in English, Portuguese and Dutch.

## Out of scope

- No changes to how sets, loads or targets are logged.
- No backend, database or migration changes.
- iOS lock-screen live countdown (the platform does not allow it).
