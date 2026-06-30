import { prisma } from './prisma'
import { mergeSettings, type OrgSettings } from './settings'

// Wczytuje scalone ustawienia organizacji (domyślne + zapisane).
export async function loadSettings(organizationId: string): Promise<OrgSettings> {
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { settings: true } })
  return mergeSettings(org?.settings)
}
