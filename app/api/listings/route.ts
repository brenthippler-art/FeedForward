import { getCurrentUser } from '@/lib/session';
import { getRecipientListings } from '@/lib/listings';
import { createListings } from '@/lib/create-listing';
import { ListingError, parseListingsInput } from '@/lib/listing-policy';

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

export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to list surplus food.' }, { status: 401, headers });
  if (user.role !== 'donor') return Response.json({ error: 'Only donors can create listings.' }, { status: 403, headers });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Provide a valid JSON request body.' }, { status: 400, headers });
  }
  try {
    const drafts = parseListingsInput(body, user.orgId);
    const listings = await createListings(user.orgId, drafts);
    return Response.json(listings, { status: 201, headers });
  } catch (error) {
    if (error instanceof ListingError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error('Unable to create listings:', error);
    return Response.json({ error: 'The listing could not be saved. Please try again shortly.' }, { status: 503, headers });
  }
}
