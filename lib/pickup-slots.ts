import { fitsPickupWindow, type PickupWindow } from '@/lib/claim-policy';

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

// Only offer future appointments that the claims endpoint will accept.
// Bound the horizon and option count even for listings without an expiry date.
export function bookablePickupSlots(
  readyAt: string, safeUntil: string | null, tier: number,
  windows: PickupWindow[], now: number,
): string[] {
  const ready = Date.parse(readyAt);
  const deadline = safeUntil === null ? now + 7 * 24 * 60 * 60 * 1000 : Date.parse(safeUntil);
  if (!Number.isFinite(ready) || !Number.isFinite(deadline) || !Number.isFinite(now)
    || windows.length === 0 || (tier === 1 && safeUntil === null)) return [];
  const start = Math.ceil(Math.max(ready, now + 1) / THIRTY_MINUTES) * THIRTY_MINUTES;
  const end = Math.min(deadline, now + 7 * 24 * 60 * 60 * 1000);
  const slots: string[] = [];
  for (let time = start; time < end && slots.length < 48; time += THIRTY_MINUTES) {
    const iso = new Date(time).toISOString();
    if (fitsPickupWindow(iso, windows)) slots.push(iso);
  }
  return slots;
}
