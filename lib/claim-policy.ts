export class ClaimError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ClaimError';
  }
}

export type ClaimInput = { listingId: number; pickupTime: string };

export function parseClaimInput(body: unknown, recipientId: number): ClaimInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ClaimError(400, 'Provide a listingId and a UTC pickupTime.');
  }
  const data = body as Record<string, unknown>;
  if (data.recipientId !== undefined && data.recipientId !== recipientId) {
    throw new ClaimError(403, 'Recipient must match the signed-in organization.');
  }
  if (!Number.isSafeInteger(data.listingId) || Number(data.listingId) <= 0 || Number(data.listingId) > 2147483647) {
    throw new ClaimError(400, 'listingId must be a positive integer.');
  }
  // Require explicit UTC, reject rollover dates, and normalize for MySQL DATETIME.
  const pickupTime = data.pickupTime;
  if (typeof pickupTime !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(pickupTime)) {
    throw new ClaimError(400, 'pickupTime must be a UTC ISO timestamp, such as 2026-10-18T15:00:00Z.');
  }
  const date = new Date(pickupTime);
  const canonical = pickupTime.includes('.') ? pickupTime : pickupTime.replace('Z', '.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== canonical || date.getUTCFullYear() < 1000 || date.getUTCFullYear() > 9999) {
    throw new ClaimError(400, 'pickupTime must be a valid date.');
  }
  // Claim.pickup_time has second precision: reject fractions rather than silently truncate.
  if (date.getUTCMilliseconds() !== 0) throw new ClaimError(400, 'pickupTime must use whole seconds.');
  return { listingId: Number(data.listingId), pickupTime: date.toISOString() };
}

export type PickupWindow = { day_of_week: string; pickup_start: string; pickup_end: string };
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const localTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', weekday: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
});

function seconds(time: string) {
  if (!/^\d{2}:\d{2}:\d{2}$/.test(time)) return null;
  const [h, m, s] = time.split(':').map(Number);
  return h < 24 && m < 60 && s < 60 ? h * 3600 + m * 60 + s : null;
}

export function fitsPickupWindow(pickupTime: string, windows: PickupWindow[]): boolean {
  const date = new Date(pickupTime);
  if (!Number.isFinite(date.getTime())) return false;
  const parts = Object.fromEntries(localTime.formatToParts(date).map(({ type, value }) => [type, value]));
  const day = DAYS.indexOf(parts.weekday);
  const previousDay = DAYS[(day + 6) % 7];
  const at = Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
  return windows.some((window) => {
    const start = seconds(window.pickup_start);
    const end = seconds(window.pickup_end);
    if (start === null || end === null) return false;
    if (end > start) return window.day_of_week === parts.weekday && at >= start && at < end;
    // Equal endpoints represent a full 24-hour window starting on day_of_week.
    return (window.day_of_week === parts.weekday && at >= start)
      || (window.day_of_week === previousDay && at < end);
  });
}

export function validateAvailability(item: {
  quantity: number; tier: number; item_name: string | null; unit: string | null;
  ready_at: string | null; safe_until: string | null; now: string;
}, pickupTime: string) {
  const pickup = Date.parse(pickupTime);
  if (item.quantity <= 0 || ![1, 2, 3].includes(item.tier)
    || !item.item_name?.trim() || !item.unit?.trim() || !item.ready_at) {
    throw new ClaimError(409, 'This listing is not available for booking.');
  }
  const ready = Date.parse(item.ready_at);
  const deadline = item.safe_until === null ? null : Date.parse(item.safe_until);
  const now = Date.parse(item.now);
  if (!Number.isFinite(ready) || !Number.isFinite(now) || (deadline !== null && !Number.isFinite(deadline))) {
    throw new ClaimError(409, 'The listing has invalid availability dates.');
  }
  if (!Number.isFinite(pickup) || pickup <= now) {
    throw new ClaimError(400, 'Choose a pickup time in the future.');
  }
  if (pickup < ready) throw new ClaimError(400, 'Pickup must be at or after the food is ready.');
  if (item.tier === 1 && !item.safe_until) throw new ClaimError(409, 'The donor must provide a pickup deadline for food intended for people.');
  if (deadline !== null && pickup >= deadline) {
    throw new ClaimError(400, 'Pickup must be before the listing deadline.');
  }
}
