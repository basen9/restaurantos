#!/bin/bash
echo "🚀 RestaurantOS Setup"
echo "====================="
echo ""
echo "1. Instalowanie zależności npm..."
npm install
echo ""
echo "2. Tworzenie bazy danych SQLite..."
npx prisma db push
echo ""
echo "3. Wypełnianie przykładowymi danymi..."
node prisma/seed.js
echo ""
echo "✅ Gotowe! Uruchom aplikację:"
echo "   npm run dev"
echo ""
echo "Otwórz: http://localhost:3000"
echo ""
echo "Konta testowe:"
echo "  Manager: manager@restaurantos.pl / manager123"
echo "  Pracownik: anna@restaurantos.pl / anna123"
