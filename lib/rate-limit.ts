// A small in-memory rate limiter. The app runs as one process under pm2,
// so one Map sees every request. It resets when the app restarts, which is fine.

// Each key remembers its own window, so an hourly limit and a daily limit can share the Map
const hits = new Map<string, { windowMs: number; times: number[] }>();

function recentHits(key: string, windowMs: number, now: number) {
  const recent = (hits.get(key)?.times ?? []).filter((time) => now - time < windowMs);
  if (recent.length > 0) hits.set(key, { windowMs, times: recent });
  else hits.delete(key);
  return recent;
}

export function isRateLimited(key: string, limit: number, windowMs: number, now = Date.now()) {
  return recentHits(key, windowMs, now).length >= limit;
}

export function recordHit(key: string, windowMs: number, now = Date.now()) {
  hits.set(key, { windowMs, times: [...recentHits(key, windowMs, now), now] });

  // Clear out visitors who haven't been back, so the Map can't grow forever
  if (hits.size > 1000) {
    for (const [oldKey, entry] of [...hits]) recentHits(oldKey, entry.windowMs, now);
  }
}