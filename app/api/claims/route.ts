import { getCurrentUser } from '@/lib/session';
import { createClaim } from '@/lib/claims';
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
