/**
 * Rest-timer sound, shared by the session screen and the mini-player so the
 * beep fires no matter which tab is open when the countdown runs out.
 */

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = ctx ?? new Ctx();
    return ctx;
  } catch {
    return null;
  }
}

/** iOS Safari starts the AudioContext suspended: unlock it on the first tap. */
export function unlockRestAudio() {
  const c = context();
  if (c && c.state === "suspended") void c.resume();
}

export function playRestBeep() {
  const c = context();
  if (!c) return;
  try {
    if (c.state === "suspended") void c.resume();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, c.currentTime + 0.15);
    gain.gain.setValueAtTime(0.25, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.25);
  } catch {
    // ignore
  }
}
