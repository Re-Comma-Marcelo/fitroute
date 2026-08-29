# Fix: save bar stays visible after saving

## What happens now

The "Unsaved changes / Discard / Save" bar shows whenever the form differs from the cached profile. After a successful save the code refetches the profile but never aligns the form with what the database actually returned. The saved row comes back normalized (numbers, array order, filled-in defaults), so the string comparison still reports a difference and the bar never disappears — even though everything is saved.

## The fix

- Use the profile object returned by `saveProfile` as the new form state right after a successful save, so form and server state are identical and the bar hides immediately.
- Compare with a stable, field-by-field snapshot instead of raw `JSON.stringify` of the whole object, so key order or array order can't produce a false "unsaved" state.
- Keep the failure path untouched: on error the form stays as typed and the bar stays visible so the user can retry.

## Technical detail

Only `src/routes/_authenticated/perfil.tsx` changes: `save()` sets `form` from the resolved `saveProfile` result (after cache invalidation), and the `dirty` memo uses a normalized comparison helper. No schema, backend, data-layer, auth, MCP or service-worker changes; no new strings.
