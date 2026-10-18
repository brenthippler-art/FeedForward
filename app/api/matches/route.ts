import { getCurrentUser } from '@/lib/session';
import { getListingMatches, MatchError } from '@/lib/matches';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to view suggested recipients.' }, { status: 401, headers });
  if (user.role !== 'donor') return Response.json({ error: 'Only donors can view suggested recipients.' }, { status: 403, headers });

  const params = new URL(request.url).searchParams;
  const rawListingId = params.get('listingId');
  if (!rawListingId || !/^\d+$/.test(rawListingId)) {
    return Response.json({ error: 'listingId must be a positive integer.' }, { status: 400, headers });
  }

  try {
    const matches = await getListingMatches(Number(rawListingId), user.orgId);
    return Response.json(matches, { headers });
  } catch (error) {
    if (error instanceof MatchError) return Response.json({ error: error.message }, { status: error.status, headers });
    console.error('Unable to load matches:', error);
    return Response.json({ error: 'Suggested recipients could not be loaded. Please try again shortly.' }, { status: 503, headers });
  }
}
