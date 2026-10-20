import { extractDrafts, ExtractError } from '@/lib/extract';
import { isRateLimited, recordHit } from '@/lib/rate-limit';
import { getCurrentUser } from '@/lib/session';

const headers = { 'Cache-Control': 'no-store' };
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const PER_VISITOR_PER_HOUR = 10;
const SITE_PER_DAY = 400; // stays under Gemini's free limit of 500 a day

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Sign in to draft listings.' }, { status: 401, headers });
  if (user.role !== 'donor') return Response.json({ error: 'Only donors can draft listings.' }, { status: 403, headers });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send the description as JSON.' }, { status: 400, headers });
  }
  const raw = body && typeof body === 'object' ? (body as { text?: unknown }).text : undefined;
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return Response.json({ error: 'Describe your surplus food first.' }, { status: 400, headers });
  if (text.length > 3000) {
    return Response.json({ error: 'Keep the description under 3,000 characters.' }, { status: 400, headers });
  }

  // Demo visitors share sign-ins, so limit by address rather than by organization
  const visitorKey = `extract:${request.headers.get('x-real-ip') ?? 'unknown'}`;
  if (isRateLimited(visitorKey, PER_VISITOR_PER_HOUR, HOUR)) {
    return Response.json(
      { error: 'You’ve used AI drafting 10 times this hour. Add items by hand, or try again later.' },
      { status: 429, headers },
    );
  }
  if (isRateLimited('extract:site', SITE_PER_DAY, DAY)) {
    return Response.json(
      { error: 'AI drafting has reached today’s limit. Add items by hand, or try again tomorrow.' },
      { status: 429, headers },
    );
  }
  // Count every attempt: each one uses a Gemini request, even if it fails
  recordHit(visitorKey, HOUR);
  recordHit('extract:site', DAY);

  try {
    const drafts = await extractDrafts(text);
    return Response.json(drafts, { headers });
  } catch (error) {
    if (error instanceof ExtractError) {
      return Response.json({ error: error.message }, { status: error.status, headers });
    }
    console.error('Drafting failed:', error instanceof Error ? error.message : 'unknown error');
    return Response.json(
      { error: 'The AI couldn’t draft listings this time. Try again, or add items by hand.' },
      { status: 503, headers },
    );
  }
}