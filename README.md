# RestaurantOS 🍽️

Kompletna platforma zarządzania restauracją — Next.js 14, SQLite, Prisma, NextAuth.

## Szybki start

### 1. Przejdź do folderu
```bash
cd restaurantos
```

### 2. Zainstaluj zależności i skonfiguruj bazę
```bash
npm run setup
```
To jedna komenda — instaluje paczki, tworzy bazę danych i wypełnia przykładowymi danymi.

### 3. (Opcjonalnie) Dodaj klucz Anthropic API
Edytuj plik `.env` i wpisz swój klucz:
```
ANTHROPIC_API_KEY="sk-ant-..."
```
Bez klucza Asystent AI wyświetli komunikat zamiast odpowiedzi.

### 4. Uruchom
```bash
npm run dev
```

Otwórz: **http://localhost:3000**

---

## Konta testowe

| Rola | Email | Hasło |
|------|-------|-------|
| Właściciel | owner@restaurantos.pl | owner123 |
| Manager | manager@restaurantos.pl | manager123 |
| Pracownik | anna@restaurantos.pl | anna123 |

---

## Funkcje

**Panel pracownika:**
- ✅ Dashboard z kontrolą zmiany (timer w czasie rzeczywistym)
- ✅ Zadania (przydzielone, w trakcie, wykonane)
- ✅ Zgłaszanie strat (ręcznie + symulacja AI Vision)
- ✅ Zgłaszanie awarii
- ✅ Urlopy i wnioski
- ✅ Powiadomienia
- ✅ Asystent AI (Claude — odpowiada na pytania o procedury)
- 🚧 Grafik, czas pracy, checklisty, remanent, produkcja (w budowie)

**Panel managera:**
- ✅ Dashboard analityczny z wykresami strat
- ✅ Zatwierdzanie urlopów
- ✅ Podgląd awarii
- 🚧 Zarządzanie grafikiem, pracownikami, zadaniami (w budowie)

---

## Stack techniczny
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Baza danych:** SQLite (lokalnie) → PostgreSQL (produkcja, jedna linijka w .env)
- **ORM:** Prisma
- **Auth:** NextAuth.js (JWT + bcrypt)
- **State:** React Query + Zustand
- **Charts:** Recharts
- **UI:** Lucide Icons, React Hot Toast

## Produkcja (PostgreSQL)
Zamień w `.env`:
```
DATABASE_URL="postgresql://user:pass@host:5432/restaurantos"
```
I uruchom: `npx prisma migrate deploy`
