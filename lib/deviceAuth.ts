// Tożsamość 2.0 — fundament „zaufane urządzenie + szybkie odblokowanie".
// Tu trzymamy CZYSTE, testowalne helpery (bez DB): tokeny urządzeń, hashowanie PIN,
// format PIN, polityka blokady, parsowanie cookies. Logika z DB żyje w API/NextAuth.
import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'

// Nazwy ciasteczek urządzenia (httpOnly — sekret nie jest dostępny dla JS klienta).
export const DEVICE_COOKIE_ID = 'ros_device_id'
export const DEVICE_COOKIE_TOKEN = 'ros_device_token'
// 180 dni „zaufania" — wygodne, ale odwoływalne i wymagające drugiego składnika (PIN/biometria).
export const DEVICE_TRUST_MAX_AGE_S = 180 * 24 * 60 * 60

// Polityka PIN: 4–6 cyfr (standard POS), blokada po serii błędów.
export const PIN_MIN_LEN = 4
export const PIN_MAX_LEN = 6
export const PIN_MAX_ATTEMPTS = 5
export const PIN_LOCKOUT_MS = 5 * 60 * 1000 // 5 min → fallback do pełnego logowania

// Wysoka entropia tokenu urządzenia → sha256 wystarcza (bcrypt zbędny dla losowego sekretu).
export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex')
}
export function hashDeviceToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
// Porównanie hashy tokenów w stałym czasie.
export function deviceTokenMatches(token: string, storedHash: string): boolean {
  const a = Buffer.from(hashDeviceToken(token))
  const b = Buffer.from(storedHash)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_MIN_LEN},${PIN_MAX_LEN}}$`).test(pin)
}
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10)
}
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

// Czy poświadczenie jest aktualnie zablokowane (po serii błędnych prób)?
export function isLocked(lockedUntil: Date | null | undefined, nowMs: number): boolean {
  return !!lockedUntil && lockedUntil.getTime() > nowMs
}
// Po nieudanej próbie: nowa liczba prób i ewentualny czas blokady.
export function nextFailureState(attempts: number, nowMs: number): { failedAttempts: number; lockedUntil: Date | null } {
  const failedAttempts = attempts + 1
  const lockedUntil = failedAttempts >= PIN_MAX_ATTEMPTS ? new Date(nowMs + PIN_LOCKOUT_MS) : null
  return { failedAttempts, lockedUntil }
}

// Parsowanie nagłówka Cookie (NextAuth authorize dostaje surowy req).
export function parseCookieHeader(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const i = part.indexOf('=')
    if (i === -1) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}
