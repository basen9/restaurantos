const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

// Pakiet uprawnień "kierownika zmiany" — pracownik z rozszerzonym dostępem.
// (Manager nie jest już osobną rolą, lecz zestawem uprawnień.)
const SHIFT_MANAGER = [
  'users.view',
  'schedule.manage',
  'shifts.view_all',
  'vacations.approve',
  'tasks.manage',
  'incidents.manage',
  'waste.view_all',
]

async function main() {
  console.log('🌱 Seeding database...')

  // Organizacja (tenant)
  const org = await prisma.organization.upsert({
    where: { slug: 'krakow-bakery' },
    update: {},
    create: { id: 'org-demo', name: 'Kraków Bakery', slug: 'krakow-bakery', plan: 'PRO' },
  })

  // Lokal
  const location = await prisma.location.upsert({
    where: { id: 'loc-krakow' },
    update: {},
    create: { id: 'loc-krakow', organizationId: org.id, name: 'Kraków Rynek', address: 'Rynek Główny 1', city: 'Kraków' },
  })

  const hash = (p) => bcrypt.hashSync(p, 10)

  const owner = await prisma.user.upsert({
    where: { email: 'owner@workos.pl' },
    update: {},
    create: {
      id: 'user-owner', organizationId: org.id, name: 'Marek Kowalski', email: 'owner@workos.pl',
      password: hash('owner123'), role: 'OWNER', position: 'Właściciel', locationId: location.id,
    },
  })

  // Dawny "manager" → pracownik z pakietem uprawnień kierownika zmiany.
  const lead = await prisma.user.upsert({
    where: { email: 'lead@workos.pl' },
    update: { permissions: SHIFT_MANAGER },
    create: {
      id: 'user-lead', organizationId: org.id, name: 'Tomasz Nowak', email: 'lead@workos.pl',
      password: hash('lead123'), role: 'EMPLOYEE', position: 'Kierownik zmiany',
      permissions: SHIFT_MANAGER, locationId: location.id,
    },
  })

  const employee = await prisma.user.upsert({
    where: { email: 'anna@workos.pl' },
    update: {},
    create: {
      id: 'user-anna', organizationId: org.id, name: 'Anna Wiśniewska', email: 'anna@workos.pl',
      password: hash('anna123'), role: 'EMPLOYEE', position: 'Barista', locationId: location.id,
    },
  })

  const emp2 = await prisma.user.upsert({
    where: { email: 'marek@workos.pl' },
    update: {},
    create: {
      id: 'user-marek', organizationId: org.id, name: 'Marek Zając', email: 'marek@workos.pl',
      password: hash('marek123'), role: 'EMPLOYEE', position: 'Piekarz', locationId: location.id,
    },
  })

  // Zmiany na ten tydzień
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  for (const d of [-3, -2, -1, 0, 1, 2]) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    await prisma.shift.upsert({
      where: { id: `shift-anna-${d}` },
      update: {},
      create: {
        id: `shift-anna-${d}`, organizationId: org.id, userId: employee.id, locationId: location.id,
        date, startTime: d % 2 === 0 ? '08:00' : '12:00', endTime: d % 2 === 0 ? '16:00' : '20:00',
        status: d < 0 ? 'COMPLETED' : 'SCHEDULED',
      },
    })
  }

  // Szablony checklist
  await prisma.checklistTemplate.upsert({
    where: { id: 'tpl-opening' },
    update: {},
    create: {
      id: 'tpl-opening', organizationId: org.id, name: 'Otwarcie lokalu', type: 'OPENING',
      items: {
        create: [
          { text: 'Uruchom ekspres do kawy i sprawdź wodę', order: 1 },
          { text: 'Sprawdź temperatury lodówek (min. 4°C)', order: 2 },
          { text: 'Przygotuj pieczywo i wypieki', order: 3 },
          { text: 'Sprawdź datę ważności produktów', order: 4 },
          { text: 'Uzupełnij opakowania i serwetki', order: 5 },
          { text: 'Wytrzyj lady i stoły', order: 6 },
          { text: 'Włącz terminal płatniczy i przetestuj', order: 7 },
        ],
      },
    },
  })

  await prisma.checklistTemplate.upsert({
    where: { id: 'tpl-closing' },
    update: {},
    create: {
      id: 'tpl-closing', organizationId: org.id, name: 'Zamknięcie lokalu', type: 'CLOSING',
      items: {
        create: [
          { text: 'Wykonaj remanent strat', order: 1 },
          { text: 'Zgłoś straty w systemie', order: 2 },
          { text: 'Zamknij kasę i przelicz utarg', order: 3 },
          { text: 'Wyczyść ekspres do kawy', order: 4 },
          { text: 'Sprawdź i zamknij lodówki', order: 5 },
          { text: 'Wyłącz urządzenia i zamknij lokal', order: 6 },
        ],
      },
    },
  })

  // Zadania
  await prisma.task.upsert({
    where: { id: 'task-1' }, update: {},
    create: { id: 'task-1', organizationId: org.id, title: 'Wykonaj remanent lodówek', priority: 'HIGH', status: 'TODO', dueTime: '14:00', assigneeId: employee.id, creatorId: lead.id },
  })
  await prisma.task.upsert({
    where: { id: 'task-2' }, update: {},
    create: { id: 'task-2', organizationId: org.id, title: 'Sprawdź dostawę i odznacz produkty', priority: 'MEDIUM', status: 'TODO', dueTime: '16:00', assigneeId: employee.id, creatorId: lead.id },
  })
  await prisma.task.upsert({
    where: { id: 'task-3' }, update: {},
    create: { id: 'task-3', organizationId: org.id, title: 'Sprawdź zapasy kawy i mleka', priority: 'LOW', status: 'DONE', assigneeId: employee.id, creatorId: lead.id, completedAt: new Date() },
  })

  // Powiadomienia
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { id: 'notif-1', organizationId: org.id, userId: employee.id, title: 'Nowy grafik na lipiec', body: 'Opublikowano grafik na lipiec. Sprawdź swoje zmiany.', type: 'SCHEDULE' },
      { id: 'notif-2', organizationId: org.id, userId: employee.id, title: 'Nowe zadanie: Remanent lodówek', body: 'Musisz wykonać remanent lodówek do godz. 14:00.', type: 'TASK' },
    ],
  })

  // Produkty
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      { id: 'prod-1', organizationId: org.id, name: 'Croissant maślany', category: 'Wypieki', costPerUnit: 6 },
      { id: 'prod-2', organizationId: org.id, name: 'Pain au chocolat', category: 'Wypieki', costPerUnit: 7 },
      { id: 'prod-3', organizationId: org.id, name: 'Sernik nowojorski', category: 'Ciasta', unit: 'sztuka', costPerUnit: 50 },
      { id: 'prod-4', organizationId: org.id, name: 'Brownie czekoladowe', category: 'Ciasta', costPerUnit: 7 },
      { id: 'prod-5', organizationId: org.id, name: 'Bułka razowa', category: 'Pieczywo', costPerUnit: 3 },
    ],
  })

  // Straty (koszt spójny z cennikiem)
  await prisma.wasteReport.createMany({
    skipDuplicates: true,
    data: [
      { id: 'waste-1', organizationId: org.id, userId: employee.id, product: 'Croissant maślany', quantity: 2, unit: 'szt', reason: 'Przekroczony termin ważności', costPerUnit: 6, totalCost: 12 },
      { id: 'waste-2', organizationId: org.id, userId: employee.id, product: 'Pain au chocolat', quantity: 1, unit: 'szt', reason: 'Wada produktu', costPerUnit: 7, totalCost: 7 },
    ],
  })

  // Urlop
  await prisma.vacation.upsert({
    where: { id: 'vac-1' }, update: {},
    create: { id: 'vac-1', organizationId: org.id, userId: employee.id, type: 'ANNUAL', startDate: new Date('2026-07-20'), endDate: new Date('2026-07-25'), days: 6, status: 'PENDING', reason: 'Wyjazd rodzinny' },
  })

  // Wiadomości
  await prisma.message.createMany({
    skipDuplicates: true,
    data: [
      { id: 'msg-1', organizationId: org.id, senderId: lead.id, recipientId: employee.id, content: 'Dzień dobry Anno! Sprawdź proszę temperatury w lodówkach dziś rano.' },
      { id: 'msg-2', organizationId: org.id, senderId: employee.id, recipientId: lead.id, content: 'Dzień dobry! Oczywiście, sprawdzę i odpisuję.' },
    ],
  })

  console.log('✅ Seed complete!')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('  Owner:    owner@workos.pl / owner123')
  console.log('  Lead:     lead@workos.pl  / lead123  (EMPLOYEE z uprawnieniami kierownika)')
  console.log('  Employee: anna@workos.pl  / anna123')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
