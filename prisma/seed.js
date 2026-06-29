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

  // Lokale (multi-lokal)
  const location = await prisma.location.upsert({
    where: { id: 'loc-krakow' },
    update: {},
    create: { id: 'loc-krakow', organizationId: org.id, name: 'Kraków Rynek', address: 'Rynek Główny 1', city: 'Kraków' },
  })
  const location2 = await prisma.location.upsert({
    where: { id: 'loc-kazimierz' },
    update: {},
    create: { id: 'loc-kazimierz', organizationId: org.id, name: 'Kraków Kazimierz', address: 'Plac Nowy 5', city: 'Kraków' },
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
    update: { locationId: location2.id },
    create: {
      id: 'user-marek', organizationId: org.id, name: 'Marek Zając', email: 'marek@workos.pl',
      password: hash('marek123'), role: 'EMPLOYEE', position: 'Piekarz', locationId: location2.id,
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

  // Produkty (z ceną sprzedaży do food cost)
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      { id: 'prod-1', organizationId: org.id, name: 'Croissant maślany', category: 'Wypieki', costPerUnit: 6, price: 12 },
      { id: 'prod-2', organizationId: org.id, name: 'Pain au chocolat', category: 'Wypieki', costPerUnit: 7, price: 14 },
      { id: 'prod-3', organizationId: org.id, name: 'Sernik nowojorski', category: 'Ciasta', unit: 'sztuka', costPerUnit: 50, price: 120 },
      { id: 'prod-4', organizationId: org.id, name: 'Brownie czekoladowe', category: 'Ciasta', costPerUnit: 7, price: 15 },
      { id: 'prod-5', organizationId: org.id, name: 'Bułka razowa', category: 'Pieczywo', costPerUnit: 3, price: 6 },
    ],
  })

  // Wymuś ceny (createMany skipDuplicates nie aktualizuje istniejących wierszy)
  const prices = { 'prod-1': 12, 'prod-2': 14, 'prod-3': 120, 'prod-4': 15, 'prod-5': 6 }
  for (const [id, price] of Object.entries(prices)) {
    await prisma.product.update({ where: { id }, data: { price } }).catch(() => {})
  }

  // Dostawca
  const supplier = await prisma.supplier.upsert({
    where: { id: 'sup-1' }, update: {},
    create: { id: 'sup-1', organizationId: org.id, name: 'Hurtownia Smaku', contact: 'Jan Kowal', phone: '600100200', email: 'biuro@hurtowniasmaku.pl' },
  })

  // Magazyn (część poniżej minimum, by uruchomić sugestie zamówień)
  const items = [
    { id: 'inv-1', name: 'Mąka pszenna typ 550', category: 'Surowce', unit: 'kg', stock: 12, minStock: 20, costPerUnit: 3 },
    { id: 'inv-2', name: 'Masło 82%', category: 'Nabiał', unit: 'kg', stock: 4, minStock: 10, costPerUnit: 32 },
    { id: 'inv-3', name: 'Czekolada deserowa', category: 'Surowce', unit: 'kg', stock: 8, minStock: 5, costPerUnit: 28 },
    { id: 'inv-4', name: 'Mleko 3.2%', category: 'Nabiał', unit: 'l', stock: 25, minStock: 15, costPerUnit: 3.5 },
  ]
  for (const it of items) {
    await prisma.inventoryItem.upsert({ where: { id: it.id }, update: {}, create: { ...it, organizationId: org.id, supplierId: supplier.id } })
  }

  // Receptura: Croissant maślany (10 szt) — mąka 1kg + masło 0.5kg
  const existingRecipe = await prisma.recipe.findUnique({ where: { productId: 'prod-1' } })
  if (!existingRecipe) {
    await prisma.recipe.create({
      data: {
        organizationId: org.id, productId: 'prod-1', yield: 10,
        items: { create: [
          { inventoryItemId: 'inv-1', quantity: 1, unit: 'kg' },
          { inventoryItemId: 'inv-2', quantity: 0.5, unit: 'kg' },
        ] },
      },
    })
  }

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

  // SOP (procedury)
  await prisma.sopDocument.createMany({
    skipDuplicates: true,
    data: [
      { id: 'sop-1', organizationId: org.id, title: 'Otwarcie lokalu', category: 'Operacje', content: '1. Włącz ekspres i sprawdź wodę.\n2. Sprawdź temperatury lodówek (min. 4°C).\n3. Przygotuj wypieki i pieczywo.\n4. Włącz terminal płatniczy.' },
      { id: 'sop-2', organizationId: org.id, title: 'Higiena i HACCP', category: 'Bezpieczeństwo', content: '1. Myj ręce co 30 min i po każdej czynności brudnej.\n2. Notuj temperatury lodówek 2× dziennie.\n3. Oznaczaj daty otwarcia produktów.' },
    ],
  })

  // Plan sali: strefy + stoliki + przykładowy otwarty rachunek
  const zoneMain = await prisma.zone.upsert({ where: { id: 'zone-main' }, update: {}, create: { id: 'zone-main', organizationId: org.id, locationId: location.id, name: 'Sala główna', sortOrder: 0 } })
  const zoneTaras = await prisma.zone.upsert({ where: { id: 'zone-taras' }, update: {}, create: { id: 'zone-taras', organizationId: org.id, locationId: location.id, name: 'Taras', sortOrder: 1 } })
  await prisma.restaurantTable.createMany({
    skipDuplicates: true,
    data: [
      { id: 'tbl-w1', organizationId: org.id, zoneId: zoneMain.id, name: 'W1', seats: 2, sortOrder: 0 },
      { id: 'tbl-w2', organizationId: org.id, zoneId: zoneMain.id, name: 'W2', seats: 4, sortOrder: 1 },
      { id: 'tbl-w3', organizationId: org.id, zoneId: zoneMain.id, name: 'W3', seats: 4, sortOrder: 2 },
      { id: 'tbl-t1', organizationId: org.id, zoneId: zoneTaras.id, name: 'T1', seats: 2, sortOrder: 0 },
      { id: 'tbl-t2', organizationId: org.id, zoneId: zoneTaras.id, name: 'T2', seats: 6, sortOrder: 1 },
    ],
  })
  const existingOrder = await prisma.tableOrder.findFirst({ where: { id: 'order-demo' } })
  if (!existingOrder) {
    await prisma.tableOrder.create({
      data: {
        id: 'order-demo', organizationId: org.id, tableId: 'tbl-w2', openedById: 'user-anna', total: 38,
        items: {
          create: [
            { name: 'Croissant maślany', productId: 'prod-1', kind: 'FOOD', quantity: 2, unitPrice: 12, status: 'SERVED' },
            { name: 'Brownie czekoladowe', productId: 'prod-4', kind: 'FOOD', quantity: 1, unitPrice: 15, status: 'PREPARING' },
            { name: 'Kawa latte', kind: 'DRINK', quantity: 1, unitPrice: 11, status: 'PENDING' },
          ],
        },
      },
    })
  }

  console.log('✅ Seed complete!')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('  Owner:    owner@workos.pl / owner123')
  console.log('  Lead:     lead@workos.pl  / lead123  (EMPLOYEE z uprawnieniami kierownika)')
  console.log('  Employee: anna@workos.pl  / anna123')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
