// A small in-memory rate limiter. The app runs as one process under pm2,
// so one Map sees every request. It resets when the app restarts, which is fine.

const hits = new Map<string, number[]>();

function recentHits(key: string, windowMs: number, now: number) {
  const recent = (hits.get(key) ?? []).filter((time) => now - time < windowMs);
  if (recent.length > 0) hits.set(key, recent);
  else hits.delete(key);
  return recent;
}

export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()) {
  return recentHits(key, windowMs, now).length >= limit;
}

export function recordHit(key: string, windowMs: number, now = Date.now()) {
  hits.set(key, [...recentHits(key, windowMs, now), now]);

  // Clear out visitors who haven't been back, so the Map can't grow forever
  if (hits.size > 1000) {
    for (const oldKey of [...hits.keys()]) recentHits(oldKey, windowMs, now);
  }
}