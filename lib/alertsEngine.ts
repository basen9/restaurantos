// Silnik alertów proaktywnych — zamienia snapshot biznesu w trwałą kolejkę decyzji.
import { prisma } from './prisma'
import { getBusinessSnapshot, type BusinessSnapshot } from './insights'
import { foodCostVariance } from './finance'
import { recipientsWithPermission } from './notify'
import { PERMISSIONS } from './permissions'
import type { AuthUser } from './api'

export interface AlertSeed {
  dedupeKey: string
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  title: string
  detail: string
  actionHref?: string
}

type VarianceRow = { name: string; variance: number; unit: string; varianceCost: number }

// Reguły → alerty. Pure (testowalne). dedupeKey zawiera dzień, by nie duplikować w obrębie doby.
export function buildAlertsFromSnapshot(s: BusinessSnapshot, variance: VarianceRow[]): AlertSeed[] {
  const day = s.date
  const out: AlertSeed[] = []

  if (s.attention.openIncidents > 0)
    out.push({ dedupeKey: `incidents:${day}`, type: 'incidents', severity: 'HIGH', title: `${s.attention.openIncidents} otwarta(e) awaria(e)`, detail: 'Sprzęt może blokować sprzedaż — zajmij się najpilniejszymi.', actionHref: '/owner/incidents' })

  if (s.inventory.lowStock.length > 0)
    out.push({ dedupeKey: `low_stock:${day}`, type: 'low_stock', severity: 'HIGH', title: `${s.inventory.lowStock.length} pozycji poniżej minimum`, detail: `Sugerowane zamówienie ~${s.inventory.orderTotal} zł: ${s.inventory.lowStock.map((i) => i.name).join(', ')}.`, actionHref: '/owner/warehouse' })

  if (s.finance.posConnected && s.finance.foodCostActualPct != null && s.finance.foodCostActualPct > 35)
    out.push({ dedupeKey: `food_cost:${day}`, type: 'food_cost', severity: 'HIGH', title: `Food cost rzeczywisty: ${s.finance.foodCostActualPct}%`, detail: 'Przekracza cel 35% — sprawdź porcje, ceny i straty.', actionHref: '/owner/recipes' })

  if (s.finance.posConnected && s.finance.laborCostPct != null && s.finance.laborCostPct > 30)
    out.push({ dedupeKey: `labor:${day}`, type: 'labor', severity: 'MEDIUM', title: `Koszt pracy wysoki: ${s.finance.laborCostPct}%`, detail: 'Rozważ korektę obsady względem prognozy ruchu.', actionHref: '/owner/schedule' })

  const v = variance.find((x) => x.varianceCost > 30)
  if (v)
    out.push({ dedupeKey: `variance:${v.name}:${day}`, type: 'variance', severity: 'HIGH', title: `Wariancja zużycia: ${v.name}`, detail: `Z magazynu zeszło o ${v.variance} ${v.unit} więcej niż wynika ze sprzedaży (~${v.varianceCost} zł). Możliwa nadprodukcja/straty/błędy porcji.`, actionHref: '/owner/recipes' })

  if (s.attention.pendingVacations > 0)
    out.push({ dedupeKey: `vacations:${day}`, type: 'vacations', severity: 'MEDIUM', title: `${s.attention.pendingVacations} wniosek(ów) urlopowy(ch)`, detail: 'Czekają na decyzję — brak odpowiedzi blokuje planowanie grafiku.', actionHref: '/owner/vacations' })

  return out
}

// Generuje i utrwala alerty (idempotentnie wobec OPEN o tym samym dedupeKey). Powiadamia właścicieli.
export async function runAlerts(user: Pick<AuthUser, 'id' | 'organizationId'>) {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const [snapshot, variance] = await Promise.all([
    getBusinessSnapshot(user),
    foodCostVariance(user.organizationId, monthStart),
  ])
  const seeds = buildAlertsFromSnapshot(snapshot, variance.filter((v) => v.varianceCost > 0))

  const existing = await prisma.alert.findMany({
    where: { organizationId: user.organizationId, status: 'OPEN', dedupeKey: { in: seeds.map((s) => s.dedupeKey) } },
    select: { dedupeKey: true },
  })
  const seen = new Set(existing.map((e) => e.dedupeKey))
  const fresh = seeds.filter((s) => !seen.has(s.dedupeKey))

  let created = 0
  for (const s of fresh) {
    await prisma.alert.create({
      data: { organizationId: user.organizationId, dedupeKey: s.dedupeKey, type: s.type, severity: s.severity, title: s.title, detail: s.detail, actionHref: s.actionHref },
    })
    created++
  }

  // Powiadom właścicieli o nowych alertach.
  if (created > 0) {
    const recipients = await recipientsWithPermission(user.organizationId, PERMISSIONS.VIEW_ANALYTICS)
    if (recipients.length) {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({ organizationId: user.organizationId, userId: r.id, title: `🔔 ${created} nowy(ch) alert(ów) AI COO`, body: fresh.map((f) => f.title).join(' · ').slice(0, 200), type: 'WARNING' as const })),
      })
    }
  }
  return { generated: seeds.length, created }
}
