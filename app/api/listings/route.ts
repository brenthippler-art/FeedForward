import { getCurrentUser } from '@/lib/session';
import { getBookableListings } from '@/lib/bookable-listings';
import { createListings, getDonorListings } from '@/lib/donor-listings';
import { ListingError, parseListingRequest } from '@/lib/listing-input';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to view available food.' }, { status: 401, headers });

  const params = new URL(request.url).searchParams;
  // Identity comes from the session; a query parameter cannot select another recipient.
  const recipientId = params.get('recipientId');
  if (recipientId !== null && (user.role !== 'recipient' || recipientId !== String(user.orgId))) {
    return Response.json({ error: 'Recipient must match the signed-in organization.' }, { status: 403, headers });
  }
  const rawTier = params.get('tier');
  if (rawTier !== null && !['1', '2', '3'].includes(rawTier)) {
    return Response.json({ error: 'Tier must be 1, 2, or 3.' }, { status: 400, headers });
  }

  try {
    const tier = rawTier === null ? undefined : Number(rawTier);
    const listings = user.role === 'donor'
      ? await getDonorListings(user.orgId, tier)
      : await getBookableListings(user.orgId, tier);
    return Response.json(listings, { headers });
  } catch (error) {
    console.error('Unable to load recipient listings:', error);
    return Response.json({ error: 'Available food could not be loaded. Please try again shortly.' }, { status: 503, headers });
  }
}


export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to post food.' }, { status: 401, headers });
  if (user.role !== 'donor') return Response.json({ error: 'Only donors can post food.' }, { status: 403, headers });
  let body: unknown;
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Provide a valid JSON request body.' }, { status: 400, headers }); }
  try {
    const listings = parseListingRequest(body, user.orgId, Date.now());
    return Response.json(await createListings(user.orgId, listings), { status: 201, headers });
  } catch (error) {
    if (error instanceof ListingError) return Response.json({ error: error.message, fields: error.fields }, { status: error.status, headers });
    console.error('Unable to save donor listings:', error);
    return Response.json({ error: 'Posting could not be confirmed. Check your posted food before starting another post.' }, { status: 503, headers });
  }
}
