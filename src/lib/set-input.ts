/** Enter jumps to the next numeric field so a whole set is one thumb flow. */
export function focusNextField(event: React.KeyboardEvent<HTMLInputElement>) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  const fields = Array.from(document.querySelectorAll<HTMLInputElement>("input.numeric-field"));
  const next = fields[fields.indexOf(event.currentTarget) + 1];
  next?.focus();
  next?.select();
}

/** Shows the running change while a number is being slid, e.g. "+2.5". */
export function formatSignedStep(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}`;
}
