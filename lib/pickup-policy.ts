export class PickupError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'PickupError';
  }
}

export type PickupInput = { claimId: number; actualLbs: number };

export function parsePickupInput(body: unknown): PickupInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new PickupError(400, 'Provide a claimId and actualLbs.');
  }
  const data = body as Record<string, unknown>;
  if (!Number.isSafeInteger(data.claimId) || Number(data.claimId) <= 0 || Number(data.claimId) > 2147483647) {
    throw new PickupError(400, 'claimId must be a positive integer.');
  }
  if (typeof data.actualLbs !== 'number' || !Number.isFinite(data.actualLbs) || data.actualLbs <= 0) {
    throw new PickupError(400, 'actualLbs must be a positive number.');
  }
  return { claimId: Number(data.claimId), actualLbs: data.actualLbs };
}
