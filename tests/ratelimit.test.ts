import { describe, it, expect, beforeEach } from 'vitest'
import { rateLimit, _resetRateLimit } from '@/lib/ratelimit'

describe('rateLimit', () => {
  beforeEach(() => _resetRateLimit())

  it('przepuszcza do limitu, potem blokuje', () => {
    const key = 'org-x'
    expect(rateLimit(key, 3, 60000).ok).toBe(true)
    expect(rateLimit(key, 3, 60000).ok).toBe(true)
    expect(rateLimit(key, 3, 60000).ok).toBe(true)
    const blocked = rateLimit(key, 3, 60000)
    expect(blocked.ok).toBe(false)
    expect(blocked.retryAfterMs).toBeGreaterThan(0)
  })

  it('izoluje liczniki per klucz', () => {
    expect(rateLimit('a', 1, 60000).ok).toBe(true)
    expect(rateLimit('a', 1, 60000).ok).toBe(false)
    expect(rateLimit('b', 1, 60000).ok).toBe(true)
  })
})
