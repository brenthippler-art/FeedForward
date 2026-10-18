import { getImpact } from '@/lib/impact';
import { getCurrentUser } from '@/lib/session';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const params = new URL(request.url).searchParams;
  const rawOrgId = params.get('orgId');
  if (rawOrgId !== null && !/^\d+$/.test(rawOrgId)) {
    return Response.json({ error: 'orgId must be a positive integer.' }, { status: 400, headers });
  }

  const user = await getCurrentUser();
  if (rawOrgId !== null && (!user || rawOrgId !== String(user.orgId))) {
    return Response.json({ error: 'Organization must match the signed-in account.' }, { status: 403, headers });
  }
  try {
    const impact = await getImpact(user?.role === 'recipient' ? user.orgId : undefined);
    return Response.json(impact, { headers });
  } catch (error) {
    console.error('Unable to load impact:', error);
    return Response.json({ error: 'Impact data could not be loaded. Please try again shortly.' }, { status: 503, headers });
  }
}
