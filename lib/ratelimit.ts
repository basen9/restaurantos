// Prosty limiter w pamięci (sliding window) per klucz (np. organizacja).
// Uwaga: działa per-instancja. Przy skalowaniu poziomym przenieść do Redis.
const buckets = new Map<string, number[]>()

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now()
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) {
    const retryAfterMs = windowMs - (now - arr[0])
    buckets.set(key, arr)
    return { ok: false, remaining: 0, retryAfterMs }
  }
  arr.push(now)
  buckets.set(key, arr)
  return { ok: true, remaining: max - arr.length, retryAfterMs: 0 }
}

// Test/util: czyszczenie stanu.
export function _resetRateLimit() {
  buckets.clear()
}
