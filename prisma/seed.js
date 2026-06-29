const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Location
  const location = await prisma.location.upsert({
    where: { id: 'loc-krakow' },
    update: {},
    create: { id: 'loc-krakow', name: 'Kraków Rynek', address: 'Rynek Główny 1', city: 'Kraków' }
  })

  // Users
  const hash = (p) => bcrypt.hashSync(p, 10)

  const owner = await prisma.user.upsert({
    where: { email: 'owner@restaurantos.pl' },
    update: {},
    create: {
      id: 'user-owner', name: 'Marek Kowalski', email: 'owner@restaurantos.pl',
      password: hash('owner123'), role: 'OWNER', position: 'Właściciel',
      locationId: location.id
    }
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@restaurantos.pl' },
    update: {},
    create: {
      id: 'user-manager', name: 'Tomasz Nowak', email: 'manager@restaurantos.pl',
      password: hash('manager123'), role: 'MANAGER', position: 'Manager',
      locationId: location.id
    }
  })

  const employee = await prisma.user.upsert({
    where: { email: 'anna@restaurantos.pl' },
    update: {},
    create: {
      id: 'user-anna', name: 'Anna Wiśniewska', email: 'anna@restaurantos.pl',
      password: hash('anna123'), role: 'EMPLOYEE', position: 'Barista',
      locationId: location.id
    }
  })

  const emp2 = await prisma.user.upsert({
    where: { email: 'marek@restaurantos.pl' },
    update: {},
    create: {
      id: 'user-marek', name: 'Marek Zając', email: 'marek@restaurantos.pl',
      password: hash('marek123'), role: 'EMPLOYEE', position: 'Piekarz',
      locationId: location.id
    }
  })

  // Shifts for this week
  const today = new Date()
  today.setHours(0,0,0,0)
  const days = [-3,-2,-1,0,1,2]
  for (const d of days) {
    const date = new Date(today)
    date.setDate(date.getDate() + d)
    await prisma.shift.upsert({
      where: { id: `shift-anna-${d}` },
      update: {},
      create: {
        id: `shift-anna-${d}`,
        userId: employee.id, locationId: location.id,
        date, startTime: d % 2 === 0 ? '08:00' : '12:00',
        endTime: d % 2 === 0 ? '16:00' : '20:00',
        status: d < 0 ? 'COMPLETED' : d === 0 ? 'SCHEDULED' : 'SCHEDULED'
      }
    })
  }

  // Checklist templates
  const opening = await prisma.checklistTemplate.upsert({
    where: { id: 'tpl-opening' },
    update: {},
    create: {
      id: 'tpl-opening', name: 'Otwarcie lokalu', type: 'OPENING',
      items: {
        create: [
          { text: 'Uruchom ekspres do kawy i sprawdź wodę', order: 1 },
          { text: 'Sprawdź temperatury lodówek (min. 4°C)', order: 2 },
          { text: 'Przygotuj pieczywo i wypieki', order: 3 },
          { text: 'Sprawdź datę ważności produktów', order: 4 },
          { text: 'Uzupełnij opakowania i serwetki', order: 5 },
          { text: 'Wytrzyj lady i stoły', order: 6 },
          { text: 'Sprawdź poziom kawy i mleka', order: 7 },
          { text: 'Włącz terminal płatniczy i przetestuj', order: 8 },
          { text: 'Sprawdź muzykę i oświetlenie', order: 9 },
          { text: 'Uzupełnij drobne w kasie', order: 10 },
        ]
      }
    }
  })

  const closing = await prisma.checklistTemplate.upsert({
    where: { id: 'tpl-closing' },
    update: {},
    create: {
      id: 'tpl-closing', name: 'Zamknięcie lokalu', type: 'CLOSING',
      items: {
        create: [
          { text: 'Wykonaj remanent strat', order: 1 },
          { text: 'Zgłoś straty w systemie', order: 2 },
          { text: 'Zamknij kasę i przelicz utarg', order: 3 },
          { text: 'Wyczyść ekspres do kawy', order: 4 },
          { text: 'Umyj i ułóż naczynia', order: 5 },
          { text: 'Posprzątaj stanowisko pracy', order: 6 },
          { text: 'Sprawdź i zamknij lodówki', order: 7 },
          { text: 'Wyłącz urządzenia elektryczne', order: 8 },
          { text: 'Sprawdź alarm i zamknij lokal', order: 9 },
        ]
      }
    }
  })

  // Tasks
  await prisma.task.upsert({
    where: { id: 'task-1' },
    update: {},
    create: {
      id: 'task-1', title: 'Wykonaj remanent lodówek', priority: 'HIGH',
      status: 'TODO', dueTime: '14:00',
      assigneeId: employee.id, creatorId: manager.id
    }
  })
  await prisma.task.upsert({
    where: { id: 'task-2' },
    update: {},
    create: {
      id: 'task-2', title: 'Sprawdź dostawę i odznacz produkty', priority: 'MEDIUM',
      status: 'TODO', dueTime: '16:00',
      assigneeId: employee.id, creatorId: manager.id
    }
  })
  await prisma.task.upsert({
    where: { id: 'task-3' },
    update: {},
    create: {
      id: 'task-3', title: 'Sprawdź zapasy kawy i mleka', priority: 'LOW',
      status: 'DONE', assigneeId: employee.id, creatorId: manager.id,
      completedAt: new Date()
    }
  })

  // Notifications
  await prisma.notification.createMany({
    skipDuplicates: true,
    data: [
      { id: 'notif-1', userId: employee.id, title: 'Nowy grafik na lipiec', body: 'Manager opublikował grafik na lipiec. Sprawdź swoje zmiany.', type: 'SCHEDULE' },
      { id: 'notif-2', userId: employee.id, title: 'Nowe zadanie: Remanent lodówek', body: 'Musisz wykonać remanent lodówek do godz. 14:00.', type: 'TASK' },
      { id: 'notif-3', userId: employee.id, title: 'Zmiana za 30 minut', body: 'Twoja zmiana (8:00–16:00) zaczyna się niedługo.', type: 'INFO' },
    ]
  })

  // Products
  await prisma.product.createMany({
    skipDuplicates: true,
    data: [
      { id: 'prod-1', name: 'Croissant maślany', category: 'Wypieki', costPerUnit: 6 },
      { id: 'prod-2', name: 'Pain au chocolat', category: 'Wypieki', costPerUnit: 7 },
      { id: 'prod-3', name: 'Sernik nowojorski', category: 'Ciasta', unit: 'sztuka', costPerUnit: 50 },
      { id: 'prod-4', name: 'Brownie czekoladowe', category: 'Ciasta', costPerUnit: 7 },
      { id: 'prod-5', name: 'Bułka razowa', category: 'Pieczywo', costPerUnit: 3 },
      { id: 'prod-6', name: 'Ciasto marchewkowe', category: 'Ciasta', unit: 'sztuka', costPerUnit: 45 },
    ]
  })

  // Waste reports
  await prisma.wasteReport.createMany({
    skipDuplicates: true,
    data: [
      { id: 'waste-1', userId: employee.id, product: 'Croissant maślany', quantity: 2, unit: 'szt', reason: 'Przekroczony termin ważności', costPerUnit: 6, totalCost: 12 },
      { id: 'waste-2', userId: employee.id, product: 'Pain au chocolat', quantity: 1, unit: 'szt', reason: 'Wada produktu', costPerUnit: 8, totalCost: 8 },
    ]
  })

  // Vacation
  await prisma.vacation.upsert({
    where: { id: 'vac-1' },
    update: {},
    create: {
      id: 'vac-1', userId: employee.id, type: 'ANNUAL',
      startDate: new Date('2026-06-20'), endDate: new Date('2026-06-25'),
      days: 6, status: 'PENDING', reason: 'Wyjazd rodzinny'
    }
  })

  // Messages
  await prisma.message.createMany({
    skipDuplicates: true,
    data: [
      { id: 'msg-1', senderId: manager.id, recipientId: employee.id, content: 'Dzień dobry Anno! Sprawdź proszę temperatury w lodówkach dziś rano.' },
      { id: 'msg-2', senderId: employee.id, recipientId: manager.id, content: 'Dzień dobry! Oczywiście, sprawdzę i odpisuję.' },
      { id: 'msg-3', senderId: manager.id, recipientId: employee.id, content: 'Świetnie, dziękuję. I pamiętaj o remanencie dziś przed 14:00 😊' },
      { id: 'msg-4', senderId: employee.id, recipientId: manager.id, content: 'Temperatura lodówki głównej 3.8°C — wszystko OK!' },
    ]
  })

  console.log('✅ Seed complete!')
  console.log('')
  console.log('🔑 Login credentials:')
  console.log('  Owner:   owner@restaurantos.pl   / owner123')
  console.log('  Manager: manager@restaurantos.pl / manager123')
  console.log('  Employee: anna@restaurantos.pl   / anna123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
