const THIRTY_MINUTES = 30 * 60 * 1000;
const NO_LIMIT_HOURS = 4;

export function pickupSlots(readyAt: string, safeUntil: string | null): string[] {
  const start = new Date(readyAt).getTime();
  const end = safeUntil
    ? new Date(safeUntil).getTime()
    : start + NO_LIMIT_HOURS * 60 * 60 * 1000;

  const slots: string[] = [];
  for (let time = start; time + THIRTY_MINUTES <= end; time += THIRTY_MINUTES) {
    slots.push(new Date(time).toISOString());
  }
  return slots;
}