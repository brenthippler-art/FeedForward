import { getCurrentUser } from '@/lib/session';
import { completePickup } from '@/lib/pickups';
import { PickupError, parsePickupInput } from '@/lib/pickup-policy';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to confirm a pickup.' }, { status: 401, headers });
  if (user.role !== 'recipient') return Response.json({ error: 'Only recipients can confirm pickups.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Provide a valid JSON request body.' }, { status: 400, headers }); }
  try {
    const input = parsePickupInput(body, user.orgId);
    return Response.json(await completePickup(user.orgId, input), { status: 201, headers });
  } catch (error) {
    if (error instanceof PickupError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error('Unable to complete pickup:', error);
    return Response.json({ error: 'Pickup confirmation is uncertain. Refresh your pickups before trying again.' }, { status: 503, headers });
  }
}
