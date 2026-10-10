type Entry = { count: number; resetAt: number };

const attempts = new Map<string, Entry>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function purgeExpired(now: number) {
  for (const [key, entry] of attempts) {
    if (now >= entry.resetAt) {
      attempts.delete(key);
    }
  }
}

export function checkLoginRateLimit(ip: string): {
  ok: boolean;
  retryAfterSec?: number;
} {
  const now = Date.now();
  purgeExpired(now);

  const entry = attempts.get(ip);

  if (!entry || now >= entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfterSec: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { ok: true };
}

export function resetLoginRateLimit(ip: string) {
  attempts.delete(ip);
}
