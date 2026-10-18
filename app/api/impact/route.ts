import { getImpact } from '@/lib/impact';

export async function GET(request: Request) {
  const headers = { 'Cache-Control': 'no-store' };
  const params = new URL(request.url).searchParams;
  const rawOrgId = params.get('orgId');
  if (rawOrgId !== null && !/^\d+$/.test(rawOrgId)) {
    return Response.json({ error: 'orgId must be a positive integer.' }, { status: 400, headers });
  }

  try {
    const impact = await getImpact(rawOrgId === null ? undefined : Number(rawOrgId));
    return Response.json(impact, { headers });
  } catch (error) {
    console.error('Unable to load impact:', error);
    return Response.json({ error: 'Impact data could not be loaded. Please try again shortly.' }, { status: 503, headers });
  }
}
