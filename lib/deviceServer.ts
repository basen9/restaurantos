// Serwerowe odczytanie „bieżącego zaufanego urządzenia" z httpOnly cookies.
// Używane przez routing korzenia i ekran /unlock (przed zalogowaniem).
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import { deviceTokenMatches, DEVICE_COOKIE_ID, DEVICE_COOKIE_TOKEN } from './deviceAuth'

export interface CurrentDevice {
  id: string
  shared: boolean
  organizationId: string
  userName: string | null // dla urządzenia osobistego
  hasPin: boolean // czy istnieje poświadczenie PIN umożliwiające odblokowanie
}

// Zwraca bieżące urządzenie, jeśli cookie wskazuje na ważny (nieodwołany) rekord
// i sekret się zgadza. W przeciwnym razie null (→ pełne logowanie).
export async function getCurrentDevice(): Promise<CurrentDevice | null> {
  const jar = cookies()
  const id = jar.get(DEVICE_COOKIE_ID)?.value
  const token = jar.get(DEVICE_COOKIE_TOKEN)?.value
  if (!id || !token) return null

  const device = await prisma.trustedDevice.findUnique({
    where: { id },
    include: { user: { select: { name: true, isActive: true } } },
  })
  if (!device || device.revokedAt || !deviceTokenMatches(token, device.tokenHash)) return null
  if (device.userId && !device.user?.isActive) return null

  // Czy da się odblokować PIN-em? Urządzenie osobiste → PIN przypisanego usera;
  // współdzielone → dowolny PIN w organizacji.
  const pinWhere: any = { organizationId: device.organizationId, type: 'PIN' as const, secret: { not: null } }
  if (device.userId) pinWhere.userId = device.userId
  const hasPin = (await prisma.authCredential.count({ where: pinWhere })) > 0

  return {
    id: device.id,
    shared: device.shared,
    organizationId: device.organizationId,
    userName: device.userId ? device.user?.name ?? null : null,
    hasPin,
  }
}
