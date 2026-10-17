import { getCurrentUser } from '@/lib/session';
import { getRecipientListings } from '@/lib/listings';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to view available food.' }, { status: 401, headers });
  if (user.role !== 'recipient') return Response.json({ error: 'Choose a recipient organization to view available food.' }, { status: 403, headers });

  const params = new URL(request.url).searchParams;
  // Identity comes from the session; a query parameter cannot select another recipient.
  const recipientId = params.get('recipientId');
  if (recipientId !== null && recipientId !== String(user.orgId)) {
    return Response.json({ error: 'Recipient must match the signed-in organization.' }, { status: 403, headers });
  }
  const rawTier = params.get('tier');
  if (rawTier !== null && !['1', '2', '3'].includes(rawTier)) {
    return Response.json({ error: 'Tier must be 1, 2, or 3.' }, { status: 400, headers });
  }

  try {
    const listings = await getRecipientListings(user.orgId, rawTier === null ? undefined : Number(rawTier));
    return Response.json(listings, { headers });
  } catch (error) {
    console.error('Unable to load recipient listings:', error);
    return Response.json({ error: 'Available food could not be loaded. Please try again shortly.' }, { status: 503, headers });
  }
}
