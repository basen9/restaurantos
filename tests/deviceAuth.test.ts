import { describe, it, expect } from 'vitest'
import {
  generateDeviceToken, hashDeviceToken, deviceTokenMatches,
  isValidPinFormat, hashPin, verifyPin,
  isLocked, nextFailureState, parseCookieHeader,
  PIN_MAX_ATTEMPTS,
} from '@/lib/deviceAuth'

describe('device token', () => {
  it('hash is deterministic and matches in constant time', () => {
    const t = generateDeviceToken()
    const h = hashDeviceToken(t)
    expect(hashDeviceToken(t)).toBe(h)
    expect(deviceTokenMatches(t, h)).toBe(true)
    expect(deviceTokenMatches('wrong', h)).toBe(false)
  })
  it('tokens are unique', () => {
    expect(generateDeviceToken()).not.toBe(generateDeviceToken())
  })
})

describe('PIN', () => {
  it('accepts 4-6 digits, rejects the rest', () => {
    expect(isValidPinFormat('1234')).toBe(true)
    expect(isValidPinFormat('123456')).toBe(true)
    expect(isValidPinFormat('123')).toBe(false)
    expect(isValidPinFormat('1234567')).toBe(false)
    expect(isValidPinFormat('12ab')).toBe(false)
    expect(isValidPinFormat('')).toBe(false)
  })
  it('hashes and verifies', async () => {
    const h = await hashPin('4271')
    expect(await verifyPin('4271', h)).toBe(true)
    expect(await verifyPin('0000', h)).toBe(false)
  })
})

describe('lockout policy', () => {
  it('isLocked respects the timestamp', () => {
    const now = 1_000_000
    expect(isLocked(new Date(now + 1000), now)).toBe(true)
    expect(isLocked(new Date(now - 1000), now)).toBe(false)
    expect(isLocked(null, now)).toBe(false)
  })
  it('locks after max attempts', () => {
    const now = 1_000_000
    let s = nextFailureState(0, now)
    expect(s.failedAttempts).toBe(1)
    expect(s.lockedUntil).toBeNull()
    s = nextFailureState(PIN_MAX_ATTEMPTS - 1, now)
    expect(s.failedAttempts).toBe(PIN_MAX_ATTEMPTS)
    expect(s.lockedUntil).not.toBeNull()
  })
})

describe('cookie parsing', () => {
  it('parses a header into a map', () => {
    const c = parseCookieHeader('a=1; ros_device_id=dev_x; ros_device_token=ab%20cd')
    expect(c.a).toBe('1')
    expect(c.ros_device_id).toBe('dev_x')
    expect(c.ros_device_token).toBe('ab cd')
  })
  it('handles empty/undefined', () => {
    expect(parseCookieHeader(undefined)).toEqual({})
    expect(parseCookieHeader('')).toEqual({})
  })
})
