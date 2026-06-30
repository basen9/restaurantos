import { describe, it, expect } from 'vitest'
import {
  base32Encode, base32Decode, generateSecret, generateTOTP, verifyTOTP, verifyTOTPStep,
  otpauthURL, generateRecoveryCodes,
} from '@/lib/totp'

describe('base32', () => {
  it('round-trips arbitrary bytes', () => {
    const buf = Buffer.from('Hello TOTP world')
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true)
  })
  it('matches RFC 4648 vector for "foobar"', () => {
    expect(base32Encode(Buffer.from('foobar'))).toBe('MZXW6YTBOI')
  })
  it('rejects invalid base32 characters (no silent skip)', () => {
    expect(() => base32Decode('MZXW6YTB01')).toThrow() // 0 i 1 spoza alfabetu
  })
})

describe('verifyTOTPStep (replay protection)', () => {
  const secret = base32Encode(Buffer.from('12345678901234567890'))
  it('returns the matched counter, monotonic with time', () => {
    const now = 1_700_000_000_000
    const s1 = verifyTOTPStep(secret, generateTOTP(secret, now), now)
    const s2 = verifyTOTPStep(secret, generateTOTP(secret, now + 30_000), now + 30_000)
    expect(s1).not.toBeNull()
    expect(s2).not.toBeNull()
    expect(s2!).toBe(s1! + 1)
  })
  it('returns null for an invalid code', () => {
    expect(verifyTOTPStep(secret, '000000', 1_700_000_000_000)).toBeNull()
  })
})

describe('TOTP RFC 6238', () => {
  // Wektor referencyjny: sekret "12345678901234567890" (ASCII) → base32.
  const secret = base32Encode(Buffer.from('12345678901234567890'))

  it('generates a 6-digit code', () => {
    const code = generateTOTP(secret, 59_000)
    expect(code).toMatch(/^\d{6}$/)
  })

  it('produces the RFC 6238 SHA-1 value at T=59s', () => {
    // RFC 6238 Appendix B (SHA-1, 8 digits = 94287082) → 6 ostatnich cyfr.
    expect(generateTOTP(secret, 59_000)).toBe('287082')
  })

  it('verifies its own current code', () => {
    const now = 1_700_000_000_000
    expect(verifyTOTP(secret, generateTOTP(secret, now), now)).toBe(true)
  })

  it('accepts a code within the ±1 step window (clock drift)', () => {
    const now = 1_700_000_000_000
    const prev = generateTOTP(secret, now - 30_000)
    expect(verifyTOTP(secret, prev, now)).toBe(true)
  })

  it('rejects a code outside the window', () => {
    const now = 1_700_000_000_000
    const old = generateTOTP(secret, now - 120_000)
    expect(verifyTOTP(secret, old, now)).toBe(false)
  })

  it('rejects malformed tokens', () => {
    const now = 1_700_000_000_000
    expect(verifyTOTP(secret, '12345', now)).toBe(false)
    expect(verifyTOTP(secret, 'abcdef', now)).toBe(false)
    expect(verifyTOTP(secret, '', now)).toBe(false)
  })

  it('tolerates spaces in the entered token', () => {
    const now = 1_700_000_000_000
    const code = generateTOTP(secret, now)
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`
    expect(verifyTOTP(secret, spaced, now)).toBe(true)
  })
})

describe('helpers', () => {
  it('generateSecret yields decodable base32', () => {
    const s = generateSecret()
    expect(s.length).toBeGreaterThan(0)
    expect(base32Decode(s).length).toBe(20)
  })
  it('otpauthURL includes issuer, label and secret', () => {
    const url = otpauthURL('ABC234', 'user@x.pl', 'RestaurantOS')
    expect(url).toContain('otpauth://totp/')
    expect(url).toContain('secret=ABC234')
    expect(url).toContain('issuer=RestaurantOS')
  })
  it('generateRecoveryCodes yields N unique xxxx-xxxx codes', () => {
    const codes = generateRecoveryCodes(10)
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
    for (const c of codes) expect(c).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}$/)
  })
})
