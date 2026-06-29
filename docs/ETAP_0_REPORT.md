# Raport — Etap 0: Utwardzenie fundamentu (security, RBAC, multi-tenant, PostgreSQL)

> Praca wyłącznie na istniejącym kodzie WorkOS V2. Bez nowego projektu, bez przebudowy od zera.
> Branch: `claude/workos-v2-audit-roadmap-rpifru`.

---

## 1. Co zostało wykonane

### 1.1 Dwie role (OWNER / EMPLOYEE) + RBAC oparty na uprawnieniach
- `User.role` zmieniono z wolnego stringa (`OWNER|MANAGER|EMPLOYEE`) na **enum `Role { OWNER EMPLOYEE }`**. Rola MANAGER usunięta.
- Dodano `User.permissions String[]` — granularne uprawnienia (`lib/permissions.ts`): `users.manage`, `vacations.approve`, `schedule.manage`, `analytics.view`, itd.
- „Manager/Księgowa/Magazynier" istnieją teraz jako **pakiety uprawnień** (`PERMISSION_BUNDLES`), nie osobne role. Konto demonstracyjne `lead@workos.pl` to EMPLOYEE z pakietem kierownika zmiany.
- Autoryzacja przez `hasPermission(user, perm)` (OWNER = wszystkie uprawnienia).

### 1.2 Naprawa krytycznych podatności (zweryfikowane runtime)
| Podatność (z audytu) | Status | Dowód testu |
|---|---|---|
| Samo-zatwierdzanie urlopu | ✅ naprawione | EMPLOYEE `PATCH /api/vacations/[id]` → **403** |
| IDOR na zmianach (`?userId=`) | ✅ naprawione | anna pyta o zmiany Marka → dostaje **tylko swoje 6** |
| Mass-assignment (`...body`) | ✅ naprawione | walidacja Zod + whitelista pól na każdym zapisie |
| Brak RBAC na danych zbiorczych | ✅ naprawione | EMPLOYEE `/api/users`, `/api/analytics` → **403** |
| Tworzenie zadań przez każdego | ✅ naprawione | EMPLOYEE `POST /api/tasks` → **403**; OWNER → **201** |
| Brak audytu | ✅ dodane | zatwierdzenie urlopu → wpis w `AuditLog` |
| `totalCost` strat z klienta | ✅ naprawione | koszt liczony po stronie serwera |

### 1.3 Poprawny RBAC + warstwa API
- Nowe `middleware.ts` — centralna brama autoryzacji stron (koniec ochrony rozproszonej po layoutach); `/owner/*` tylko dla OWNER.
- `lib/api.ts` — `handle()` (obsługa błędów), `requireAuth()`, `requirePermission()`, `parseBody()` (Zod), `orgScope()` (izolacja tenanta).
- `lib/validation.ts` — schematy Zod dla wszystkich zapisów.
- **Wszystkie 19 endpointów przepisane** na ten wzorzec.

### 1.4 Multi-tenancy (pełne)
- Dodano model **`Organization`** (tenant) + `slug`, `plan`, `isActive`.
- `organizationId` na wszystkich modelach operacyjnych + indeksy `@@index([organizationId, ...])`.
- Każde zapytanie zawężone przez `orgScope(user)` — twarda izolacja danych między organizacjami.
- Sesja NextAuth niesie `organizationId` i `permissions`.

### 1.5 Migracja na PostgreSQL
- `datasource` zmienione z SQLite na **PostgreSQL**; usunięto `prisma/dev.db`.
- Utworzono migrację `init_postgres_multitenant_rbac` (historia migracji zamiast `db push`).
- Wszystkie pola statusów/typów skonwertowane na **enumy Prisma** (integralność na poziomie bazy).
- Seed przepisany pod tenant + dwie role; uruchomiony pomyślnie.

### 1.6 Porządki w architekturze/UI
- `/manager/*` → `/owner/*` (trasy, layout, linki, nawigacja).
- `Sidebar` przebudowany: dwie role, sekcje „Centrum dowodzenia / Zespół / Operacje", usunięty „przełącznik widoku".
- Root (`app/page.tsx`) rozgałęzia po roli: OWNER → `/owner`, EMPLOYEE → `/dashboard`.
- Dashboard pracownika: **trwały stan zmiany** (z bazy) + usunięte atrapy („18 dni urlopu" → realne wyliczenie, „Zaplanowano 8:00" → realna godzina zmiany).

### 1.7 Weryfikacja
- `tsc --noEmit` ✅ · `next build` ✅ (middleware skompilowany) · smoke-testy RBAC/IDOR/audyt ✅.

---

## 2. Co zostało ulepszone względem poprzedniej wersji

- **Bezpieczeństwo 3/10 → istotnie wyżej:** kluczowe IDOR/RBAC/mass-assignment zamknięte i przetestowane.
- **Model danych:** wolne stringi → enumy; brak izolacji → multi-tenant; brak indeksów → indeksy pod zapytania i raporty.
- **Architektura:** logika rozlana po route'ach → wspólna warstwa (`lib/api.ts`, walidacja, audyt, middleware).
- **Spójność ról:** „OWNER == MANAGER" i pusty OWNER → czysty model dwóch ról z granularnymi uprawnieniami.
- **Uczciwość UI:** zniknęły zahardkodowane dane udające rzeczywiste.
- **Skalowalność:** SQLite (jeden plik) → PostgreSQL gotowy na produkcję i wielu najemców.

---

## 3. Nowe pomysły (pełna lista w `SUGGESTIONS.md`)

- **Skrzynka decyzji** (Decision Inbox) — rekomendacje z akcją i wpływem finansowym (rdzeń AI COO).
- **Theoretical vs Actual food cost** — wariancja jako detektor strat/kradzieży.
- **Tryb kiosk/mobilny** dla pracownika — lepkość i przewaga nad systemami desktopowymi.
- **OCR faktur + KSeF** — moat regulacyjny PL/EU.
- **AI z tool-use + streaming** zamiast „ślepego" czatu.

---

## 4. Co warto zrobić w następnym etapie (Etap 1)

1. **Responsywna powłoka + tryb kiosk** (warunek użyteczności mobilnej).
2. **Dashboard właściciela** na realnych danych (5 pytań w 30 s) — fundament pod Skrzynkę decyzji.
3. **Dokończenie modułów pracownika** na istniejących modelach: grafik (mój), godziny pracy, dostępność, checklisty, produkcja, remanent, zamiana zmian, SOP.
4. **Panele właściciela** (`/owner/*`): pracownicy, urlopy (z RBAC), straty, zadania, analityka.
5. **UI: tokeny designu + a11y** (spłata długu przed rozrostem ekranów).
6. **Food cost MVP**: modele `Recipe`/`RecipeItem` + powiązanie z produktami (przygotowanie pod Etap 2).

---

## 5. Uwagi techniczne / środowiskowe

- Silniki Prisma (schema-engine, libquery) pobrano ręcznie przez `curl` z powodu ograniczeń proxy na natywnym downloaderze Node — uruchomienie lokalnie wymaga ich obecności lub `NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- `.env` jest ignorowany (sekrety); `.env.example` zaktualizowany na PostgreSQL.
- Konta testowe: `owner@workos.pl/owner123`, `lead@workos.pl/lead123` (EMPLOYEE z uprawnieniami), `anna@workos.pl/anna123`.
