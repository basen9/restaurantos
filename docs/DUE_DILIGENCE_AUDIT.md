# WorkOS V2 — Końcowy audyt (Technical Due Diligence)

> Niezależna ocena przed scaleniem PR-ów. Perspektywa: Senior CTO / DD Engineer.
> Metoda: weryfikacja na działającym kodzie (testy, build, skan tenant/RBAC, indeksy, `npm audit`), nie deklaracje.
> Zakres: gałąź `claude/multi-location` (zawiera Etap 0–3 + 4 moduły premium). 35 endpointów API, 30 stron, 6 migracji, 19 testów jednostkowych.

---

## 0. Wynik twardych checków
- ✅ `vitest`: 19/19 · `tsc --noEmit`: czysto · `next build`: czysto.
- ✅ **Wszystkie 35 endpointów** mają `requireAuth`/`requirePermission`.
- ✅ Izolacja tenanta: każdy route scope'uje po `organizationId` (bezpośrednio lub przez warstwę serwisową — zweryfikowano `invoiceService`, `scheduleService`).
- ⚠️ `npm audit`: **1 krytyczna + 3 umiarkowane** (next-auth ≤4.24.14 → podatne `uuid`; Next.js 14.2.5 ma znane CVE).

---

## 1. Bezpieczeństwo (RBAC / autoryzacja / multi-tenant / IDOR / OWASP)

**Mocne:**
- RBAC oparty na uprawnieniach, spójny `requirePermission`; wcześniejsze krytyczne luki (samo-zatwierdzanie urlopu, IDOR zmian, mass-assignment) naprawione i przetestowane.
- Twarda izolacja tenanta (`orgScope` + serwisy) — brak wykrytego wycieku między organizacjami.
- Walidacja wejścia (Zod) + whitelista pól na każdym zapisie; `middleware.ts` chroni strony; audyt części operacji wrażliwych.
- Prisma (parametryzowane zapytania) → brak SQLi; sekrety w `.env` (gitignore).

**Słabe / do naprawy:**
1. 🔴 **Podatne zależności** (krytyczna): next-auth/uuid + Next.js 14.2.5. Przed produkcją: aktualizacja (`next@14.2.x` patch, next-auth) i ponowny `npm audit`.
2. 🟠 **Rate-limiting tylko na `/api/coo`.** Kosztowne/AI endpointy bez limitu: `/api/invoices/ocr` (Vision = $), `/api/pos` (sync), `/api/ksef`. Ryzyko nadużycia kosztów/DoS.
3. 🟠 **Limiter w pamięci** (`lib/ratelimit.ts`) — nie działa przy >1 instancji (skalowanie poziome). Docelowo Redis.
4. 🟡 **Luki w audycie** — `sales`, `locations`, `invoices` (ręczne) mutują bez `audit()`. Niespójny ślad.
5. 🟡 **JWT bez natychmiastowego odwołania** + dev `NEXTAUTH_SECRET` w repo-przykładzie — produkcyjnie wymusić silny sekret i rotację.
6. 🟡 **`/api/sales` POST = `requireAuth`** (każdy pracownik tworzy sprzedaż) — akceptowalne dla kasy, ale umożliwia zaśmiecenie analityki; rozważyć uprawnienie/źródło.
7. 🟡 Brak jawnych nagłówków bezpieczeństwa (CSP, HSTS) i tokenów CSRF na API (chroni SameSite cookie — wystarczające, ale warto dopiąć).

---

## 2. Architektura (backend + frontend)

**Mocne:** czytelna warstwowość — `lib/api.ts` (auth/validation/error/tenant), serwisy domenowe (`finance`, `insights`, `cooTools`, `invoiceService`, `scheduleService`, `locationAnalytics`), spójny wzorzec `handle()`. Frontend: App Router, React Query, wspólne komponenty UI, responsywna powłoka.

**Słabe / refaktor:**
1. 🟠 **Martwy kod w `/api/analytics`** — po refaktorze multi-lokal `users`, `locations`, `userLoc` są pobierane, lecz nieużywane (zbędne zapytania DB). Do usunięcia.
2. 🟡 **Duplikacja agregacji** — `analytics`, `insights` (AI COO) i `locationAnalytics` liczą podobne metryki osobno. Warto wydzielić jedną warstwę metryk.
3. 🟡 **Typowanie `any`** w stronach klienckich (dane z fetch) — brak współdzielonych typów API (DTO). Ryzyko cichych regresji.
4. 🟡 **Workaround silników Prisma** (ręczne pobranie binarek) — środowiskowe, ale do udokumentowania w deploy.
5. 🟡 Brak warstwy zdarzeń/kolejki i crona (potrzebne dla alertów, auto-przeglądów AI, realnego POS/KSeF pull).

---

## 3. Baza danych i migracje
- ✅ 6 migracji, enumy, indeksy `organizationId(+...)`, kaskady `onDelete`. Multi-tenant od fundamentu.
- 🟠 **Brak indeksu `Sale.locationId`** (używany w groupBy/filtrze per-lokal) — dodać `@@index([organizationId, locationId, soldAt])`.
- 🟡 Część zapytań analitycznych agreguje „na żywo" z `findMany` + JS — przy wolumenie potrzebne metryki materializowane / indeksy pokrywające.
- 🟡 Brak `prisma migrate deploy` w pipeline + brak strategii backupów/retencji (produkcja).

---

## 4. Wydajność
- 🟠 **N+1 w `locationAnalytics`** — `locations.map(async → await locationLaborToday)` = 1 zapytanie/lokal. Zastąpić jednym `groupBy`/agregacją.
- 🟠 **`/api/analytics` ciężki** — wiele agregacji + martwe zapytania + brak cache; wołany z dashboardu co 60 s przez każdą instancję klienta.
- 🟡 Polling React Query (30–60 s) zamiast SSE/websocket dla liczników.
- 🟡 Brak cache (metryki, snapshot AI) i paginacji na niektórych listach (są limity `take`, ale bez kursora).

---

## 5. Jakość kodu
- ✅ Spójny styl, walidacja, obsługa błędów (`handle`), testy logiki czystej (finanse, RBAC, rate-limit, dopasowanie faktur, grafik, ranking lokali).
- 🟠 **Brak testów API/integracyjnych i E2E** — weryfikacja integracji była ręczna (curl). Do CI potrzebne testy route'ów (np. z testową bazą) + Playwright.
- 🟡 Martwy kod (analytics), `any` w UI, brak ESLint w pipeline, brak CI.

---

## 6. Kompletność modułów
- ✅ Zbudowane (działające): dashboard CEO, AI COO (premium), analityka/POS, magazyn, faktury (OCR/KSeF), receptury/food cost, grafik (smart), lokale; panel pracownika: dashboard, grafik, czas pracy, checklisty, produkcja, remanent, wiadomości, urlopy, straty, awarie, zadania, wyniki, asystent.
- 🔴 **6 stron „w budowie" nadal w nawigacji** (martwe linki): `/swaps` (zamiana zmian) oraz panele właściciela `/owner/{employees, tasks, vacations, waste, incidents}` — przeniesione ze starego katalogu, nigdy nie dokończone. Właściciel klika i trafia w „🚧".
- 🟡 Braki względem wizji: dostępność (model jest, brak UI/API), SOP, silnik alertów, powiadomienia push, benchmarki, cyfrowy bliźniak.

---

## 7. UX / UI
- ✅ Spójny, dojrzały ciemny motyw; responsywna powłoka (drawer mobilny); Skrzynka decyzji jako sensowne centrum.
- 🟠 **Martwe linki** (pkt 6) psują wrażenie kompletności.
- 🟡 Brak dostępności (a11y: `aria-*`, focus-ring), brak filtra lokalu na dashboardzie, brak skeletonów (tylko spinner), część akcji bez potwierdzeń.

---

## 8. Potencjalne bugi (zidentyfikowane)
- `analytics`: martwe zapytania (jw.) — nie błąd funkcjonalny, ale dług.
- `seed`: `upsert(update:{})` nie aktualizował istniejących rekordów (naprawione dla cen i lokalizacji pracownika; wzorzec do przeglądu w innych upsertach).
- Limiter w pamięci zeruje się przy restarcie/instancji — limit nie jest globalny.
- Brak walidacji rozmiaru obrazu w `/api/invoices/ocr` (duży payload base64 → koszt/limit body).

---

## Oceny (1–10)

| Kategoria | Ocena | Uzasadnienie |
|---|---:|---|
| **Architektura** | 7 | Dobra warstwowość i izolacja; minus: martwy kod, duplikacja metryk, brak kolejki/crona, `any` w UI. |
| **Bezpieczeństwo** | 6 | Solidny RBAC/tenant/walidacja/audyt; minus: **krytyczna podatność zależności**, rate-limit tylko AI, limiter w pamięci, luki audytu. |
| **UX** | 6 | Spójny i responsywny; minus: 6 martwych linków, brak a11y i filtra lokalu. |
| **Wydajność** | 5 | Działa w małej skali; N+1, ciężka analityka bez cache, polling. |
| **Skalowalność** | 6 | Multi-tenant + indeksy to dobry fundament; minus: limiter w pamięci, brak materializacji metryk/kolejek, brak indeksu Sale.locationId. |
| **AI** | 7 | Architektura tool-use + degradacja + trwałe przeglądy to realna przewaga; minus: brak streamingu/budżetu tokenów, niezweryfikowane z realnym kluczem, brak crona. |
| **Gotowość komercyjna** | 4 | Blokery: podatne zależności, brak CI/E2E, mock POS/KSeF, 6 placeholderów, brak monitoringu/backupów, dev sekret. |

**Werdykt:** silny, spójny fundament „AI Operating System" z realnymi wyróżnikami (AI COO, pętla food cost, OCR/KSeF, smart grafik, multi-lokal). **Nie jest jeszcze production-ready** — przed komercją wymaga: aktualizacji zależności, dokończenia 6 stron, rate-limitu na AI/OCR, usunięcia martwego kodu + indeksu, testów integracyjnych/E2E + CI, realnych integracji POS/KSeF, monitoringu.

---

## 9. Braki względem wizji „AI Restaurant Manager"
- **Operacje/HR:** dostępność (UI/API), zamiana zmian, SOP, onboarding pracownika, kadry/płace (ZUS/PPK), grafik wg kompetencji.
- **Sprzedaż/finanse:** realny POS (Toast/Square/GoPOS), realny KSeF/JPK, prognoza cash-flow, rozliczenia/napiwki, integracja księgowa/bankowa.
- **Inteligencja:** silnik alertów + cron, powiadomienia push/e-mail, cotygodniowy auto-przegląd AI, anomalie/fraud, benchmarki (efekt sieci), cyfrowy bliźniak (symulacje „co-jeśli").
- **Zgodność:** dziennik HACCP, temperatury, partie/terminy (FIFO), audyt pełny.
- **Panele właściciela:** zarządzanie pracownikami/zadaniami/urlopami/stratami/awariami (obecnie placeholdery).
- **UX:** a11y, filtr lokalu na dashboardzie, raporty z eksportem (PDF/CSV), aplikacja mobilna/kiosk.

## 10. Funkcje premium (przewaga nad Toast/Lightspeed/Square/Oracle MICROS/GoPOS)
- **Predykcyjny cash-flow i menu engineering** — AI rekomenduje ceny/karty dań wg marży i popytu (dynamic pricing).
- **Auto-zakupy z marketplace dostawców** — zamówienia generowane z prognozy + negocjacja cen; prowizja jako przychód.
- **Wykrywanie kradzieży/fraudu** — wariancja food cost + anomalie kasowe + korelacja zmiana↔straty.
- **Benchmark sieciowy (anonimowy)** — „Twój food cost vs podobne lokale w mieście" — efekt sieci, bariera wejścia.
- **Cyfrowy bliźniak** — symulacje „co-jeśli" (ceny, dostawca, obsada) z prognozą P&L.
- **Moat PL/EU** — natywne KSeF/JPK/ZUS/PPK/HACCP, których globalni gracze nie mają.
- **Voice/chat ops** — głosowe zapytania właściciela; raport głosowy „jak poszło dziś".
- **Zrównoważony rozwój (ESG)** — raport marnotrawstwa/śladu, zgodny z presją regulacyjną i marketingiem.
