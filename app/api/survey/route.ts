import { sendMail } from '@/lib/mailer';
import { isRateLimited, recordHit } from '@/lib/rate-limit';
import { formatSurveyEmail, validateAnswers } from '@/lib/survey-submission';
import { surveys } from '@/lib/surveys';

const headers = { 'Cache-Control': 'no-store' };
const LIMIT = 5;
const WINDOW_MS = 60 * 60 * 1000; // one hour

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Send the survey as JSON.' }, { status: 400, headers });
  }
  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Send the survey as JSON.' }, { status: 400, headers });
  }
  const { kind, answers, website, source } = body as Record<string, unknown>;

  // Honeypot: people never see this field, bots fill it in. Pretend it worked.
  if (typeof website === 'string' && website.trim() !== '') {
    return Response.json({ ok: true }, { headers });
  }

  if (kind !== 'donor' && kind !== 'recipient') {
    return Response.json({ error: 'Unknown survey.' }, { status: 400, headers });
  }

  // nginx sets X-Real-IP to the visitor's address
  const visitor = request.headers.get('x-real-ip') ?? 'unknown';
  const key = `survey:${visitor}`;
  if (isRateLimited(key, LIMIT, WINDOW_MS)) {
    return Response.json(
      { error: 'Too many surveys from this connection. Please try again in an hour.' },
      { status: 429, headers },
    );
  }

  const survey = surveys[kind];
  const result = validateAnswers(survey, answers);
  if (!result.ok) {
    return Response.json({ error: 'Some answers need attention.', fields: result.errors }, { status: 400, headers });
  }

  // Only short tags like "card" from a QR code link
  const tag = typeof source === 'string' && /^[a-z0-9-]{1,30}$/i.test(source) ? source : undefined;

  try {
    await sendMail(formatSurveyEmail(survey, result.answers, tag));
  } catch (error) {
    // Log that sending failed and why, never the answers themselves
    console.error('Survey email failed:', error instanceof Error ? error.message : 'unknown error');
    return Response.json(
      { error: 'We couldn’t send your answers. Please try again in a few minutes.' },
      { status: 503, headers },
    );
  }

  recordHit(key, WINDOW_MS);
  console.log(`Survey sent: ${kind}${tag ? ` (${tag})` : ''}`);
  return Response.json({ ok: true }, { headers });
}