export class PickupError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PickupError';
  }
}

export type PickupInput = { claimId: number; actualLbs: number };

export function parsePickupInput(body: unknown, recipientId: number): PickupInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PickupError(400, 'Provide a claimId and actualLbs.');
  }
  const data = body as Record<string, unknown>;
  if (data.recipientId !== undefined && data.recipientId !== recipientId) {
    throw new PickupError(403, 'Recipient must match the signed-in organization.');
  }
  if (!Number.isSafeInteger(data.claimId) || Number(data.claimId) <= 0 || Number(data.claimId) > 2147483647) {
    throw new PickupError(400, 'claimId must be a positive integer.');
  }
  const weight = data.actualLbs;
  // Pickup.actual_lbs is DECIMAL(10,3); reject precision loss instead of rounding silently.
  if (typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0.001 || weight > 9999999.999
    || Math.abs(weight * 1000 - Math.round(weight * 1000)) > 0.000001) {
    throw new PickupError(400, 'actualLbs must be a positive number with at most three decimal places, up to 9999999.999.');
  }
  if (data.quantity !== undefined) throw new PickupError(400, 'Pickup collects the entire reservation; quantity is determined by the server.');
  return { claimId: Number(data.claimId), actualLbs: weight };
}

export function validatePickupTime(item: {
  ready_at: string | null; safe_until: string | null; tier: number;
}, pickupTime: string, now: string) {
  const ready = item.ready_at === null ? NaN : Date.parse(item.ready_at);
  const booked = Date.parse(pickupTime);
  const clock = Date.parse(now);
  const deadline = item.safe_until === null ? null : Date.parse(item.safe_until);
  if (![ready, booked, clock].every(Number.isFinite) || (deadline !== null && !Number.isFinite(deadline))
    || (item.tier === 1 && deadline === null)) {
    throw new PickupError(409, 'This reservation has invalid pickup availability.');
  }
  if (clock < ready || clock < booked) throw new PickupError(409, 'Pickup cannot be confirmed before the food is ready and the reserved pickup time.');
  if (deadline !== null && clock >= deadline) throw new PickupError(409, 'This listing’s pickup deadline has passed.');
}
