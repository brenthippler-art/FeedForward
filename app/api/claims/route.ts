import { getCurrentUser } from '@/lib/session';
import { createClaim } from '@/lib/claims';
import { getRecipientClaims } from '@/lib/recipient-claims';
import { ClaimError, parseClaimInput } from '@/lib/claim-policy';

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to claim food.' }, { status: 401, headers });
  if (user.role !== 'recipient') return Response.json({ error: 'Only recipients can claim food.' }, { status: 403, headers });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Provide a valid JSON request body.' }, { status: 400, headers });
  }
  try {
    const input = parseClaimInput(body, user.orgId);
    const claim = await createClaim(user.orgId, input);
    return Response.json(claim, { status: 201, headers });
  } catch (error) {
    if (error instanceof ClaimError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error('Unable to create claim:', error);
    return Response.json({ error: 'The booking could not be confirmed. Refresh available food before trying again.' }, { status: 503, headers });
  }
}


export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to view your pickups.' }, { status: 401, headers });
  if (user.role !== 'recipient') return Response.json({ error: 'Only recipients can view their pickups.' }, { status: 403, headers });
  const recipientId = new URL(request.url).searchParams.get('recipientId');
  if (recipientId !== null && recipientId !== String(user.orgId)) {
    return Response.json({ error: 'Recipient must match the signed-in organization.' }, { status: 403, headers });
  }
  try {
    return Response.json(await getRecipientClaims(user.orgId), { headers });
  } catch (error) {
    console.error('Unable to load recipient claims:', error);
    return Response.json({ error: 'Your pickups could not be loaded. Please try again.' }, { status: 503, headers });
  }
}
