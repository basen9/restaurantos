# WorkOS V2 — Audyt produktu i roadmapa rozwoju

> Dokument przygotowany na podstawie pełnego audytu repozytorium (kod, baza, API, frontend, role).
> Repozytorium w kodzie nosi nazwę **RestaurantOS** (Next.js 14 / Prisma / SQLite / NextAuth).
> Data: 2026-06-29. Charakter dokumentu: **audyt + rekomendacje** (bez zmian w kodzie aplikacji).

---

## 0. Stack i architektura w pigułce

| Warstwa | Technologia | Uwaga |
|---|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind | Spójny, ciemny motyw „premium" |
| Backend | Next.js API Routes (REST, ręcznie) | Brak warstwy serwisowej / walidacji |
| Baza | SQLite + Prisma ORM | Produkcyjnie docelowo PostgreSQL |
| Auth | NextAuth (Credentials, JWT, bcrypt) | Brak middleware, ochrona per-layout |
| Stan | React Query + Zustand | RQ użyty dobrze; Zustand minimalnie |
| Wykresy / UI | Recharts, lucide-react, react-hot-toast | Spójna biblioteka komponentów `ui/` |
| AI | Bezpośredni `fetch` do Claude API | Prosty czat, bez danych biznesowych |

**Statystyka kodu:** ~96 plików (59 `.tsx`, 23 `.ts`). 1 lokal w danych startowych. 3 role w schemacie.

---

## 1. Aktualny stan projektu

### 1A. Funkcje UKOŃCZONE (działają end-to-end: UI + API + baza)

| Funkcja | Zakres | Trasa |
|---|---|---|
| Logowanie | Credentials + JWT, konta testowe, animowane UI | `/login` |
| Dashboard pracownika | Kontrola zmiany (timer), 4 statystyki, szybkie akcje, zadania, powiadomienia | `/dashboard` |
| Dashboard managera | 4 metryki, wykres strat wg produktu, lista „do zatwierdzenia" | `/manager` |
| Zadania | Pełny CRUD, filtry, priorytety, modal, powiadomienia | `/tasks` |
| Straty (waste) | Ręczne + **symulacja** AI Vision (mock), podsumowanie kosztu dnia | `/waste` |
| Awarie (incidents) | Zgłaszanie, kategorie, statusy, priorytety | `/incidents` |
| Urlopy | Wniosek, kalkulacja dni, statusy, statystyki | `/vacation` |
| Powiadomienia | Lista wg typu, „przeczytaj wszystkie", auto-refetch 30s | `/notifications` |
| Asystent AI | Czat z Claude, historia, sugestie pytań | `/assistant` |
| Powłoka aplikacji | AppShell, Sidebar (2 zestawy nawigacji), TopBar, badge'y live | `components/` |
| Biblioteka UI | Badge, StatCard, EmptyState, LoadingSpinner, Modal | `components/ui/` |

### 1B. Funkcje CZĘŚCIOWO ukończone (są ślady — API/schema/UI — ale niespójne)

| Funkcja | Co jest | Czego brakuje |
|---|---|---|
| Kontrola zmiany | Endpoint `/api/shifts/clock`, timer w UI | Stan zmiany trzymany **tylko lokalnie** — po odświeżeniu znika; brak walidacji shiftu |
| Grafik (schedule) | Modele `Schedule`, `Shift`, API `/api/shifts` | UI to placeholder „w budowie"; brak tworzenia/publikacji grafiku |
| Remanent (inventory) | Model + API GET/POST | UI placeholder |
| Produkcja | Model + API GET/POST | UI placeholder |
| Checklisty | Modele Template/Item/Run/Completion, API | UI placeholder |
| Wiadomości | Model + API (izolacja per user) | UI placeholder |
| Analityka managera | API `/api/analytics` z agregacjami | UI placeholder; brak filtrów po lokalu/okresie |
| Produkty / food cost | Model `Product` z `costPerUnit`, API GET | Brak powiązania receptura↔produkt, brak kalkulacji food cost |

### 1C. Funkcje BRAKUJĄCE (placeholder „🚧 w budowie" lub całkowicie nieobecne)

**Strony placeholder (15):** `/schedule`, `/time`, `/swaps`, `/messages`, `/production`, `/performance`, `/inventory`, `/checklists` oraz wszystkie manager: `/manager/{employees,tasks,incidents,vacations,waste,schedule,analytics}`.

**Całkowicie nieobecne (brak modelu, API i UI):** magazyn z poziomami zapasów, receptury/BOM, zakupy i zamówienia, hurtownie/dostawcy, finanse i P&L, raporty, silnik alertów, OCR faktur, benchmarki, „cyfrowy bliźniak", integracje (POS, księgowość), dostępność jako edytowalny moduł (model jest, UI nie), **dashboard CEO** i **AI COO**.

---

## 2. Ocena produktu

| Wymiar | Ocena | Komentarz |
|---|---|---|
| **UI** | 8/10 | Bardzo spójny, dojrzały wizualnie ciemny motyw; jednolite komponenty, stany ładowania/puste, toasty. |
| **UX** | 6/10 | Dobry dla ukończonych ekranów, ale ~60% nawigacji prowadzi do „w budowie" — duża luka oczekiwań. |
| **Architektura** | 5/10 | Czytelna struktura Next.js, ale brak warstwy domenowej/serwisowej, walidacji i middleware; logika w route'ach. |
| **Skalowalność** | 4/10 | SQLite, brak multi-tenant/multi-lokal w praktyce, brak indeksów pod raporty, brak kolejek/cache. |
| **Bezpieczeństwo** | 3/10 | Liczne IDOR, brak RBAC na zapisie, masowy przypis (`...body`), brak walidacji i rate-limitu. |
| **Gotowość produkcyjna** | 3/10 | Brak testów, migracji, logowania, audytu, obsługi błędów po stronie serwera, env hardening. |

### Największe problemy (TOP 7)

1. **IDOR + brak RBAC na zapisie.** Każdy zalogowany użytkownik może m.in. **zatwierdzić własny urlop** (`PATCH /api/vacations/[id]` bez kontroli roli), edytować/usuwać cudze zadania, tworzyć zmiany dla innych, czytać cudze zmiany przez `?userId=`.
2. **Masowy przypis przez `...body`/`...item`** w POST/PATCH (tasks, waste, vacations, incidents, inventory, production, shifts) — klient może nadpisać dowolne pola (`status`, `approvedBy`, `costPerUnit`, `totalCost`).
3. **Rola OWNER jest pusta** — funkcjonalnie identyczna z MANAGER (`role === 'MANAGER' || role === 'OWNER'`). Brak dashboardu CEO i jakiejkolwiek separacji.
4. **Brak middleware autoryzacji** — ochrona rozproszona po `layout.tsx`; łatwo o lukę w nowej trasie.
5. **60% produktu to placeholdery** — nawigacja obiecuje moduły, których nie ma.
6. **AI to „ślepy" czat** — nie ma dostępu do danych firmy (sprzedaż, straty, zapasy), brak narzędzi/tool-use, brak streamingu i limitów kosztów. Daleko od „AI COO".
7. **Brak fundamentów produkcyjnych** — testy, walidacja (np. Zod), audyt zdarzeń, rate-limiting, migracje, obsługa błędów.

---

## 3. Docelowa wizja produktu

**WorkOS = AI COO dla gastronomii.** Nie aplikacja do grafików, nie HR, nie prosty system dla pracowników. To system, który **zamienia dane operacyjne w decyzje biznesowe**.

Produkt = **dwa widoki** zależne od typu konta:

### Widok WŁAŚCICIEL (pełny dostęp)
Dashboard CEO · AI COO · Lokale · Pracownicy · Grafiki · Urlopy · Produkcja · Straty · Magazyn · Receptury · Zakupy · Hurtownie · Food cost · Finanse · Raporty · Alerty · AI Chat · OCR faktur · Benchmarki · Cyfrowy bliźniak biznesu · Integracje.

### Widok PRACOWNIK (dostęp ograniczony)
Dashboard · Rozpocznij/Zakończ zmianę · Grafik · Godziny pracy · Urlopy · Dostępność · Zamiana zmian · Zadania · Checklisty · Produkcja · Zgłaszanie strat · Remanenty · Zgłaszanie awarii · Powiadomienia · SOP · AI Assistant.

---

## 4. Uproszczenie systemu ról

**Cel:** zlikwidować sztywne wiele ról. Docelowo tylko **WŁAŚCICIEL** i **PRACOWNIK**. W przyszłości — dodatkowe uprawnienia nadawane pracownikom (model capabilities/permissions).

### Co zmienić (koncepcyjnie — bez implementacji w tym kroku)
- `User.role` → dwie wartości: `OWNER` | `EMPLOYEE` (migracja: dotychczasowy `MANAGER` → `OWNER` lub `EMPLOYEE` z rozszerzonymi uprawnieniami, do decyzji biznesowej).
- Dodać model uprawnień granularnych na przyszłość, np. `User.permissions: string[]` (np. `APPROVE_VACATIONS`, `MANAGE_SCHEDULE`, `VIEW_FINANCE`) — pracownik z uprawnieniem pełni rolę „zastępcy".
- Autoryzację oprzeć na **uprawnieniach**, nie na nazwie roli (`can(user, 'APPROVE_VACATIONS')`), co od razu rozwiązuje problem „OWNER == MANAGER".
- Wprowadzić **middleware** + centralny helper `requirePermission()` w API zamiast rozproszonych `if (role === ...)`.

### Wpływ na obecny kod
- Sidebar: dwa zestawy nawigacji już istnieją → wystarczy zmapować `manager*` na `owner*` i wyłączyć „przełącznik widoku" (lub zostawić jako podgląd właściciela).
- Trasy `/manager/*` → docelowo `/owner/*` (lub bez prefiksu, decydowane uprawnieniem).

---

## 5. Analiza braków (obecny stan → wizja)

Legenda trudności: 🟢 łatwe · 🟡 średnie · 🔴 trudne. Wpływ: ⭐ (1–3).

### Widok WŁAŚCICIEL

| Funkcja | Stan | Trudność | Zależności | Wpływ |
|---|---|---|---|---|
| Dashboard CEO | Brak (jest tylko dashboard managera) | 🟡 | Finanse, straty, magazyn, zakupy, alerty | ⭐⭐⭐ |
| AI COO | Brak | 🔴 | **Wszystkie dane** + warstwa analityczna + LLM tool-use | ⭐⭐⭐ |
| Lokale (multi) | Model `Location` jest; UI brak | 🟡 | Filtrowanie wszystkich danych po lokalu | ⭐⭐⭐ |
| Pracownicy | Placeholder | 🟢 | API users (istnieje) + RBAC | ⭐⭐ |
| Grafiki | Modele są; UI brak | 🔴 | Dostępność, koszty pracy, kompetencje | ⭐⭐⭐ |
| Urlopy (zatwierdzanie) | API jest (niezabezpieczone) | 🟢 | RBAC | ⭐⭐ |
| Produkcja | API jest; UI brak | 🟢 | Receptury (dla zużycia) | ⭐⭐ |
| Straty (analityka) | Zgłaszanie działa | 🟡 | Magazyn, food cost | ⭐⭐⭐ |
| Magazyn | Brak | 🔴 | Produkty, zakupy, receptury, remanent | ⭐⭐⭐ |
| Receptury (BOM) | Brak (jest tylko `Product`) | 🔴 | Produkty, magazyn, food cost | ⭐⭐⭐ |
| Zakupy / zamówienia | Brak | 🔴 | Magazyn, hurtownie | ⭐⭐⭐ |
| Hurtownie / dostawcy | Brak | 🟡 | Zakupy | ⭐⭐ |
| Food cost | Brak | 🔴 | Receptury + ceny zakupu + sprzedaż | ⭐⭐⭐ |
| Finanse / P&L | Brak | 🔴 | Sprzedaż (POS), koszty, koszty pracy | ⭐⭐⭐ |
| Raporty | Brak (jest 1 endpoint analytics) | 🟡 | Wszystkie dane + eksport | ⭐⭐ |
| Alerty (silnik reguł) | Brak (jest tylko `Notification`) | 🟡 | Dane operacyjne + harmonogram (cron) | ⭐⭐⭐ |
| AI Chat (właściciel) | Czat istnieje, bez danych | 🔴 | Tool-use nad bazą | ⭐⭐⭐ |
| OCR faktur | Brak | 🔴 | Storage plików + LLM Vision + magazyn/zakupy | ⭐⭐ |
| Benchmarki | Brak | 🔴 | Dane historyczne + dane branżowe | ⭐⭐ |
| Cyfrowy bliźniak biznesu | Brak | 🔴 | Pełna integracja danych + symulacja | ⭐⭐⭐ |
| Integracje (POS/księgowość) | Brak | 🔴 | API zewnętrzne, ETL | ⭐⭐⭐ |

### Widok PRACOWNIK

| Funkcja | Stan | Trudność | Zależności | Wpływ |
|---|---|---|---|---|
| Dashboard | ✅ Gotowy | — | — | ⭐⭐ |
| Rozpocznij/Zakończ zmianę | Częściowy (stan lokalny) | 🟢 | Trwały stan zmiany w bazie | ⭐⭐⭐ |
| Grafik (mój) | Placeholder | 🟡 | Moduł grafików właściciela | ⭐⭐⭐ |
| Godziny pracy | Placeholder | 🟢 | Trwałe zmiany (clock in/out) | ⭐⭐ |
| Urlopy | ✅ Gotowy | — | — | ⭐⭐ |
| Dostępność | Model jest; UI brak | 🟢 | — | ⭐⭐ |
| Zamiana zmian | Model `ShiftSwap` jest; UI/API brak | 🟡 | Grafik | ⭐⭐ |
| Zadania | ✅ Gotowy | — | — | ⭐⭐ |
| Checklisty | API jest; UI brak | 🟡 | — | ⭐⭐ |
| Produkcja | API jest; UI brak | 🟢 | Receptury | ⭐⭐ |
| Zgłaszanie strat | ✅ Gotowy | — | — | ⭐⭐ |
| Remanenty | API jest; UI brak | 🟡 | Magazyn | ⭐⭐ |
| Zgłaszanie awarii | ✅ Gotowy | — | — | ⭐ |
| Powiadomienia | ✅ Gotowy | — | — | ⭐ |
| SOP (procedury) | Brak | 🟡 | Storage treści + AI | ⭐⭐ |
| AI Assistant | ✅ Czat działa (bez danych) | 🟡 | Kontekst SOP/receptur | ⭐⭐ |

---

## 6. Roadmapa (priorytety)

### Etap 0 — Fundament i bezpieczeństwo (warunek wstępny, ~1–2 tyg.)
*Bez tego dalszy rozwój jest ryzykowny.*
- Uproszczenie ról do `OWNER`/`EMPLOYEE` + model uprawnień granularnych.
- Middleware autoryzacji + helper `requirePermission()`.
- Naprawa IDOR/RBAC i zastąpienie `...body` walidacją (Zod) z whitelistą pól.
- Trwały stan zmiany w bazie, audyt zdarzeń, podstawowy rate-limit, migracja na PostgreSQL.

### Etap 1 — Największa wartość biznesowa
- **Dashboard CEO** (centrum dowodzenia — patrz §7).
- Dokończenie modułów pracownika opartych o istniejące modele: grafik (mój), godziny pracy, dostępność, checklisty, produkcja, remanent, zamiana zmian.
- Panele właściciela na istniejących danych: pracownicy, urlopy (zatwierdzanie z RBAC), straty, zadania.
- **Food cost (MVP)**: receptury (BOM) + ceny produktów → marża pozycji.

### Etap 2 — Rozbudowa operacyjna
- **Magazyn** (poziomy zapasów, ruchy, remanent ↔ magazyn).
- **Zakupy i zamówienia** + **hurtownie/dostawcy**.
- **Grafiki** (planowanie + koszt pracy + dostępność/kompetencje).
- **Raporty** z eksportem; **multi-lokal** (filtrowanie wszystkiego po lokalu).
- **SOP** + podpięcie do AI Assistant.

### Etap 3 — AI COO (serce produktu)
- **Silnik alertów** (reguły + cron) → wkład do AI COO.
- **AI COO**: analiza danych → rekomendacje i decyzje (patrz §8).
- **AI Chat z tool-use** nad bazą (właściciel pyta, system sięga po dane).
- **OCR faktur** (Vision) → automatyczne pozycje zakupu/magazyn.

### Etap 4 — Integracje
- POS (sprzedaż w czasie rzeczywistym → finanse, food cost, prognozy).
- Księgowość/fiskalizacja, bankowość, dostawcy (zamówienia EDI/API).
- Webhooki i publiczne API.

### Etap 5 — Skalowanie
- Pełny multi-tenant/multi-lokal, RBAC zaawansowany.
- **Benchmarki** (porównania między lokalami i do branży).
- **Cyfrowy bliźniak biznesu** (symulacje „co-jeśli").
- Wydajność: cache, kolejki, hurtownia danych pod raporty, observability.

---

## 7. Dashboard właściciela (propozycja)

**Cel:** w 30 sekund właściciel wie: *ile zarobił · gdzie traci · co zamówić · który lokal najlepszy · co wymaga uwagi.*

### Układ (góra → dół)

**Pasek górny — przełącznik lokalu + zakres dat** (Dziś / Tydzień / Miesiąc), wszystkie dane reagują na wybór.

**Rząd 1 — „Ile zarobiłem" (5 kafli KPI z trendem vs poprzedni okres):**
- Sprzedaż (z POS / wpis ręczny)
- Marża / zysk operacyjny
- Food cost % (cel vs realny)
- Koszt pracy % (labor cost)
- Liczba transakcji / średni paragon

**Rząd 2 — „Gdzie tracę pieniądze":**
- Straty (kwota + trend) z top produktami
- Odchylenia remanentu (oczekiwane vs rzeczywiste = „znikający towar")
- Pozycje z najgorszą marżą (food cost > cel)
- Nadgodziny / przekroczenia kosztu pracy

**Rząd 3 — „Co muszę zamówić":**
- Produkty poniżej minimum (z prognozą wyczerpania)
- Sugerowane zamówienia (ilość + dostawca + szac. koszt) — wsad do modułu Zakupy
- Faktury do zaksięgowania (z OCR)

**Rząd 4 — „Który lokal działa najlepiej" (gdy multi-lokal):**
- Ranking lokali: sprzedaż, marża, food cost %, straty %, koszt pracy %
- Mapa/heatmapa wskaźników

**Rząd 5 — „Co wymaga uwagi" (Skrzynka decyzji = wyjście AI COO):**
- Lista alertów priorytetowych z **akcją** (np. „Zatwierdź zamówienie", „Sprawdź lokal X", „Marża spadła o 4 pp").
- Wnioski do zatwierdzenia (urlopy, zakupy, korekty).

### Zasady projektowe
- Każdy kafel **klikalny** → przejście do modułu źródłowego.
- Kolory statusów (zielony/żółty/czerwony) wg progów celów ustawionych przez właściciela.
- Domyślnie pokazuj **odchylenia i wyjątki**, nie surowe liczby — „mniej znaczy więcej".
- Sekcja AI COO zawsze na górze obszaru „uwaga" — to most do §8.

---

## 8. AI COO — specyfikacja modułu

> Najważniejsza funkcja produktu. Ma **zamieniać dane w decyzje**, nie generować tekst.

### 8.1 Rola i zasada działania
AI COO to warstwa decyzyjna nad wszystkimi danymi operacyjnymi. Pętla: **Obserwuj → Analizuj → Rekomenduj → (Działaj) → Ucz się.**
Każdy wynik to **decyzja z uzasadnieniem i akcją**, nie sama liczba.

### 8.2 Wejścia (źródła danych)
Sprzedaż (POS), food cost (receptury × ceny zakupu), straty, remanent/magazyn, zakupy, koszt pracy (grafiki + zmiany), urlopy/dostępność, awarie, produkcja, faktury (OCR), dane historyczne i sezonowość, (docelowo) benchmarki branżowe.

### 8.3 Komponenty
1. **Warstwa metryk** — spójne, policzone wskaźniki (food cost %, labor %, marża, rotacja zapasów, straty %, sprzedaż/rbh).
2. **Silnik reguł i anomalii** — progi celów + wykrywanie odchyleń (np. food cost > cel o 3 pp, zużycie ≠ sprzedaż = możliwa kradzież/błąd porcjowania).
3. **Prognozy** — popyt/sprzedaż (sezonowość, dzień tygodnia, pogoda), zapotrzebowanie na zakupy, obsada vs ruch.
4. **Warstwa rozumowania (LLM + tool-use)** — model sięga po dane przez narzędzia (`getSales`, `getFoodCost`, `getStock`, `getLaborCost`...), generuje rekomendacje i je uzasadnia. Domyślnie **Claude (claude-opus-4-8 / sonnet 4.6)**.
5. **Skrzynka decyzji** — kolejka rekomendacji z priorytetem, wpływem finansowym i akcją (zatwierdź/odrzuć/odłóż); akcje wpięte w moduły (zakupy, grafik).
6. **Pętla uczenia** — śledzenie, które rekomendacje właściciel przyjął i jaki dały efekt → dostrajanie progów.

### 8.4 Przykładowe decyzje generowane przez AI COO
- „Food cost wzrósł do 34% (cel 30%). Główny powód: cena masła +18% u dostawcy A. **Akcja:** przełącz na dostawcę B (−9%) — szac. oszczędność 1 200 zł/mc."
- „W lokalu Rynek zużycie mąki o 12% wyższe niż sprzedaż wypieków. **Akcja:** zleć remanent kontrolny — możliwa strata 600 zł/mc."
- „Piątek prognoza +30% ruchu; obecna obsada za mała o 1 os. **Akcja:** dodaj zmianę 12–18 (kandydaci wg dostępności: Anna, Marek)."
- „5 produktów poniżej minimum, wyczerpanie w 2 dni. **Akcja:** wyślij zamówienie do hurtowni X (847 zł)."

### 8.5 Tryby pracy
- **Proaktywny** — codzienny/cogodzinny przegląd → alerty do Skrzynki decyzji i na dashboard CEO.
- **Konwersacyjny** — właściciel pyta naturalnym językiem („dlaczego marża spadła?"), AI sięga po dane (tool-use) i odpowiada z liczbami + rekomendacją.
- **Raportujący** — automatyczne podsumowania (dzienne/tygodniowe/miesięczne) z wnioskami.

### 8.6 Wymagania techniczne
- **Tool-use / function calling** nad bazą (read-only do analiz, akcje przez zatwierdzenie).
- **Streaming** odpowiedzi, **limity tokenów/kosztów per użytkownik**, cache wyników metryk.
- **Cron/scheduler** dla trybu proaktywnego.
- **Pełny audyt** rekomendacji i decyzji (kto, kiedy, co zatwierdził).
- Ścisła separacja danych per lokal/właściciel (multi-tenant) zanim AI uzyska szeroki dostęp do danych.

### 8.7 Etapowe wdrożenie AI COO
- **MVP:** metryki + reguły + Skrzynka decyzji na istniejących danych (straty, urlopy, zadania) + czat z tool-use nad bazą.
- **V1:** food cost + zakupy + prognozy popytu i obsady.
- **V2:** OCR faktur, benchmarki, symulacje („cyfrowy bliźniak"), pętla uczenia.

---

## Załącznik: rekomendacje natychmiastowe (skrót Etapu 0)

1. Naprawić `PATCH /api/vacations/[id]` — kontrola roli/uprawnień (krytyczne: samo-zatwierdzanie urlopu).
2. Usunąć `...body`/`...item` z create/update — whitelista pól + walidacja (Zod).
3. Dodać kontrolę właściciela zasobu (tasks, shifts) — koniec IDOR.
4. Dodać `middleware.ts` z autoryzacją trasy + centralny `requirePermission()`.
5. Trwały stan zmiany (clock in/out) w bazie zamiast stanu lokalnego.
6. Uprościć role do `OWNER`/`EMPLOYEE` + model uprawnień granularnych.
7. Zaplanować migrację SQLite → PostgreSQL przed budową raportów/AI COO.
