import { getCurrentUser } from '@/lib/session';
import { createPickup } from '@/lib/pickups';
import { PickupError, parsePickupInput } from '@/lib/pickup-policy';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to record a pickup.' }, { status: 401, headers });
  if (user.role !== 'recipient') return Response.json({ error: 'Only recipients can record a pickup.' }, { status: 403, headers });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Provide a valid JSON request body.' }, { status: 400, headers });
  }
  try {
    const input = parsePickupInput(body);
    const pickup = await createPickup(user.orgId, input);
    return Response.json(pickup, { status: 201, headers });
  } catch (error) {
    if (error instanceof PickupError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error('Unable to record pickup:', error);
    return Response.json({ error: 'The pickup could not be recorded. Please try again shortly.' }, { status: 503, headers });
  }
}
