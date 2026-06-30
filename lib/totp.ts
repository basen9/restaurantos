// TOTP (RFC 6238) bez zewnętrznych bibliotek — wyłącznie node:crypto.
// Zgodne z Google Authenticator / Authy / 1Password (SHA-1, 6 cyfr, okno 30 s).
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const PERIOD = 30
const DIGITS = 6

// Kodowanie base32 (RFC 4648, bez paddingu) — format sekretu oczekiwany przez aplikacje TOTP.
export function base32Encode(buf: Buffer): string {
  let bits = 0
  let value = 0
  let out = ''
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i]
    bits += 8
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return out
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const out: number[] = []
  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch)
    if (idx === -1) throw new Error('Nieprawidłowy znak base32') // brak cichego pomijania
    value = (value << 5) | idx
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return Buffer.from(out)
}

// Nowy sekret 2FA (20 bajtów = 160 bit, rekomendacja RFC 4226) w base32.
export function generateSecret(): string {
  return base32Encode(randomBytes(20))
}

// Liczy kod TOTP dla danego licznika (kroku czasowego).
function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  // 64-bitowy licznik big-endian (górne 32 bity ~ 0 dla realistycznych dat).
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0)
  buf.writeUInt32BE(counter >>> 0, 4)
  const hmac = createHmac('sha1', key).update(buf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, '0')
}

// Bieżący kod TOTP dla podanego czasu (ms). nowMs wstrzykiwany dla testów.
export function generateTOTP(secret: string, nowMs: number): string {
  return hotp(secret, Math.floor(nowMs / 1000 / PERIOD))
}

// Weryfikacja kodu z tolerancją ±`window` kroków (domyślnie ±1 = ±30 s),
// co kompensuje dryf zegara. Zwraca dopasowany krok czasowy (do ochrony przed
// replay) albo null. Porównanie w stałym czasie. Błąd dekodowania sekretu = brak dopasowania.
export function verifyTOTPStep(secret: string, token: string, nowMs: number, window = 1): number | null {
  if (!secret || !token) return null
  const normalized = token.replace(/\s/g, '')
  if (!/^\d{6}$/.test(normalized)) return null
  const counter = Math.floor(nowMs / 1000 / PERIOD)
  try {
    for (let i = -window; i <= window; i++) {
      const candidate = hotp(secret, counter + i)
      const a = Buffer.from(candidate)
      const b = Buffer.from(normalized)
      if (a.length === b.length && timingSafeEqual(a, b)) return counter + i
    }
  } catch {
    return null
  }
  return null
}

// Wariant logiczny (true/false) — wygodny w testach i prostych wywołaniach.
export function verifyTOTP(secret: string, token: string, nowMs: number, window = 1): boolean {
  return verifyTOTPStep(secret, token, nowMs, window) !== null
}

// otpauth:// URI do wygenerowania kodu QR w aplikacji uwierzytelniającej.
export function otpauthURL(secret: string, label: string, issuer: string): string {
  const enc = encodeURIComponent
  return `otpauth://totp/${enc(issuer)}:${enc(label)}?secret=${secret}&issuer=${enc(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`
}

// Generuje N jednorazowych kodów odzyskiwania (czytelny format xxxx-xxxx).
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = []
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(4).toString('hex') // 8 znaków hex
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4, 8)}`)
  }
  return codes
}
