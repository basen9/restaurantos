# RestaurantOS 🍽️

**AI Operating System dla gastronomii** — system zarządzania restauracją z wbudowanym
AI COO (dyrektorem operacyjnym), pętlą food cost, OCR faktur, inteligentnym grafikiem
i analityką wielu lokali.

Stack: **Next.js 14 (App Router) · TypeScript · PostgreSQL · Prisma · NextAuth · Tailwind · Claude API**

---

## Szybki start

### 1. Zależności
```bash
npm install
```

### 2. Baza danych (PostgreSQL)
Ustaw w `.env`:
```
DATABASE_URL="postgresql://user:pass@localhost:5432/restaurantos?schema=public"
NEXTAUTH_SECRET="<min. 32 znaki>"
NEXTAUTH_URL="http://localhost:3000"
```
Następnie:
```bash
npx prisma migrate deploy   # lub: npx prisma migrate dev (środowisko dev)
node prisma/seed.js         # dane przykładowe
```

### 3. (Opcjonalnie) Klucz Anthropic API
```
ANTHROPIC_API_KEY="sk-ant-..."
```
Bez klucza moduły AI (COO, asystent, OCR) działają w trybie regułowym (graceful degradation).

### 4. Uruchom
```bash
npm run dev      # tryb deweloperski
# lub produkcyjnie:
npm run build && npm run start
```
Otwórz **http://localhost:3000**

---

## Konta testowe

| Rola | Email | Hasło |
|------|-------|-------|
| Właściciel (OWNER) | owner@workos.pl | owner123 |
| Pracownik z uprawnieniami kierownika (EMPLOYEE) | lead@workos.pl | lead123 |
| Pracownik (EMPLOYEE) | anna@workos.pl | anna123 |

> System ma **dwie role**: **OWNER** (pełen dostęp) i **EMPLOYEE** (funkcje pracownicze).
> Rozszerzone uprawnienia („kierownik zmiany", „księgowa", „magazynier") nadaje się pracownikowi
> jako **zestawy uprawnień** (`lib/permissions.ts`), nie jako osobne role.

---

## Funkcje

**Panel właściciela (OWNER):**
- ✅ Dashboard enterprise — odpowiada w 30 s: ile zarobiłem / gdzie tracę / który lokal rentowny / co zamówić / co wymaga uwagi
- ✅ AI COO — agentowy doradca (tool-use, Claude) z dostępem do sprzedaży, kosztu pracy, magazynu, wariancji food cost
- ✅ Centrum alertów — silnik reguł (`lib/alertsEngine.ts`), deduplikacja, powiadomienia
- ✅ Analityka — sprzedaż POS, finanse, koszt pracy, marża, wykresy
- ✅ Magazyn, dostawcy, ruchy stanów
- ✅ Faktury — OCR (Claude Vision) + KSeF (mock) + auto-aktualizacja cen zakupu
- ✅ Receptury i food cost + wariancja (teoretyczny vs rzeczywisty rozchód)
- ✅ Inteligentny grafik — prognoza ruchu, rekomendacja obsady, wykrywanie luk
- ✅ Wiele lokali — analityka i ranking rentowności
- ✅ Raporty / eksport CSV (sprzedaż, straty, magazyn, food cost)
- ✅ Zespół — zarządzanie pracownikami i uprawnieniami

**Panel pracownika (EMPLOYEE):**
- ✅ Dashboard z kontrolą zmiany (timer w czasie rzeczywistym)
- ✅ Grafik, czas pracy, dostępność
- ✅ Zadania, checklisty, produkcja, remanent
- ✅ Zgłaszanie strat i awarii
- ✅ Urlopy i wnioski, powiadomienia, wiadomości
- ✅ Procedury (SOP), wyniki, asystent AI

---

## Architektura

- **Multi-tenant:** model `Organization` + `organizationId` na każdej tabeli; izolacja przez `orgScope()`.
- **RBAC po uprawnieniach:** `lib/permissions.ts` (`PERMISSIONS`, `PERMISSION_BUNDLES`, `hasPermission`).
- **Wspólna warstwa API:** `lib/api.ts` — `handle()`, `requireAuth`/`requirePermission`, `parseBody` (Zod),
  `orgScope`, `enforceRateLimit`, `ApiError`, logowanie.
- **Pętla pieniądza:** zakup → magazyn → receptura → produkcja (rozchód) → sprzedaż (POS) →
  przychód/marża/food cost/koszt pracy/zysk → wariancja → decyzje AI COO.
- **AI:** Claude API (`claude-opus-4-8` COO/OCR, `claude-sonnet-4-6` asystent), tryb regułowy bez klucza.
- **Audyt:** `AuditLog` zapisuje mutacje; rate limiting (`lib/ratelimit.ts`); logger JSON (`lib/logger.ts`).

## Stack techniczny
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, React Query, Zustand, Recharts
- **Backend:** Next.js API Routes, Zod
- **Baza:** PostgreSQL (multi-tenant), Prisma Migrate
- **Auth:** NextAuth.js (JWT + bcrypt), sesja 8 h
- **AI:** Anthropic Claude API

---

## Testy i CI

```bash
npm run test        # vitest — testy jednostkowe (funkcje czyste)
npx tsc --noEmit    # typecheck
npm run build       # build produkcyjny
npm run smoke       # smoke integracyjny (API/RBAC, wymaga działającego serwera + seed)
npm run test:e2e    # Playwright E2E (logowanie wg roli)
```

CI (`.github/workflows/ci.yml`) uruchamia na każdym PR: serwis PostgreSQL, `prisma migrate deploy`,
testy jednostkowe, typecheck, build, seed, start serwera i smoke integracyjny.

## Produkcja

1. Ustaw `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, opcjonalnie `ANTHROPIC_API_KEY`.
2. `npx prisma migrate deploy`
3. `npm run build && npm run start`

Szczegóły wydania: [`docs/RELEASE_v1.0.md`](docs/RELEASE_v1.0.md).
