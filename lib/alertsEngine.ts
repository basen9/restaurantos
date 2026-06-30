// Silnik alertów proaktywnych — zamienia snapshot biznesu w trwałą kolejkę decyzji.
import { prisma } from './prisma'
import { getBusinessSnapshot, type BusinessSnapshot } from './insights'
import { foodCostVariance } from './finance'
import { oldestUnservedMin } from './floor'
import { loadSettings } from './settingsService'
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

// Alert "wolnej obsługi": stoliki, których najstarsza niewydana pozycja czeka >= próg.
// Pure → testowalne. day w dedupeKey, by nie spamować w obrębie doby.
export function buildSlowServiceAlert(
  openOrders: { tableName: string; items: { status?: string; voided?: boolean; createdAt?: Date | string }[] }[],
  thresholdMin: number,
  now: number,
  day: string,
): AlertSeed | null {
  const slow = openOrders
    .map((o) => ({ table: o.tableName, wait: oldestUnservedMin(o.items as any, now) }))
    .filter((o) => o.wait != null && o.wait >= thresholdMin)
    .sort((a, b) => (b.wait || 0) - (a.wait || 0))
  if (!slow.length) return null
  return {
    dedupeKey: `slow_service:${day}`,
    type: 'slow_service',
    severity: 'HIGH',
    title: `${slow.length} stolik(ów) czeka długo na wydanie`,
    detail: `Najdłużej: ${slow.slice(0, 3).map((s) => `${s.table} (${s.wait} min)`).join(', ')}. Sprawdź kuchnię/obsługę.`,
    actionHref: '/owner/floor',
  }
}

// Generuje i utrwala alerty (idempotentnie wobec OPEN o tym samym dedupeKey). Powiadamia właścicieli.
export async function runAlerts(user: Pick<AuthUser, 'id' | 'organizationId'>) {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const [snapshot, variance] = await Promise.all([
    getBusinessSnapshot(user),
    foodCostVariance(user.organizationId, monthStart),
  ])
  const seeds = buildAlertsFromSnapshot(snapshot, variance.filter((v) => v.varianceCost > 0))

  // Alert wolnej obsługi z bieżącego stanu sali (próg z ustawień).
  const [settings, openOrders] = await Promise.all([
    loadSettings(user.organizationId),
    prisma.tableOrder.findMany({ where: { organizationId: user.organizationId, status: 'OPEN' }, include: { items: { select: { status: true, voided: true, createdAt: true } }, table: { select: { name: true } } } }),
  ])
  const slowSeed = buildSlowServiceAlert(openOrders.map((o) => ({ tableName: o.table?.name || '—', items: o.items })), settings.slowServiceMinutes, Date.now(), snapshot.date)
  if (slowSeed) seeds.push(slowSeed)

  const existing = await prisma.alert.findMany({
    where: { organizationId: user.organizationId, status: 'OPEN', dedupeKey: { in: seeds.map((s) => s.dedupeKey) } },
    select: { dedupeKey: true },
  })
  const seen = new Set(existing.map((e) => e.dedupeKey))
  const fresh = seeds.filter((s) => !seen.has(s.dedupeKey))

  let created = 0
  if (fresh.length) {
    const res = await prisma.alert.createMany({
      data: fresh.map((s) => ({ organizationId: user.organizationId, dedupeKey: s.dedupeKey, type: s.type, severity: s.severity, title: s.title, detail: s.detail, actionHref: s.actionHref })),
    })
    created = res.count
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
