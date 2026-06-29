# WorkOS V2 — Strategiczny audyt produktu i roadmapa komercyjna

> Pogłębiona analiza istniejącego kodu (bez tworzenia nowego projektu i bez przebudowy architektury od zera).
> Perspektywa: Senior Product Manager budujący kategoryjny produkt „AI Operating System dla gastronomii".
> Repozytorium: **RestaurantOS** (Next.js 14 / Prisma / SQLite / NextAuth). Data: 2026-06-29.
> Dokument uzupełnia `docs/WORKOS_V2_AUDIT.md` o ocenę krytyczną, wzorce konkurencyjne i plan wdrożenia.

---

## 0. Metoda i zakres audytu (czego dotknąłem)

Przejrzane bezpośrednio: schemat Prisma (19 modeli), wszystkie 19 plików API route, warstwa auth (`lib/auth.ts`, brak `middleware.ts`), powłoka (`AppShell`, `Sidebar`, `TopBar`), `DashboardClient`, layouty ochrony tras, `globals.css` + tailwind, `lib/utils.ts`, `prisma/seed.js`, reprezentatywne strony „w budowie". Tezy poniżej są oparte na konkretnych liniach kodu, nie na domysłach.

**Werdykt jednozdaniowy:** to dobrze wyglądający, spójny wizualnie *szkielet aplikacji pracowniczej dla jednej kawiarni* — z poważnymi lukami bezpieczeństwa i bez ~80% modułów potrzebnych do wizji „AI COO". Fundament wystarczy, by **kontynuować**, ale wymaga utwardzenia (security + model danych) zanim dobuduje się wartość.

---

## 1. Decyzja produktowa: DWIE role (OWNER / EMPLOYEE)

### Stan obecny (zweryfikowany)
- `User.role` to wolny `String` z trzema wartościami: `OWNER | MANAGER | EMPLOYEE` (`schema.prisma:15`).
- W praktyce **OWNER == MANAGER**: `isManager = role === 'MANAGER' || role === 'OWNER'` (`Sidebar.tsx:59`), identyczne layouty, ten sam panel `/manager`.
- Seed tworzy konto MANAGER (`seed.js:29`), nawigacja nazywa się `managerNav`, trasy żyją pod `/manager/*`.
- Nie istnieją osobne role „Księgowa"/„Magazynier" w kodzie — pojawiają się tylko jako pomysł. **Nie ma czego usuwać w bazie poza `MANAGER`.**

### Co konkretnie zrobić (plan, bez kodu w tym kroku)
1. **Model:** ograniczyć rolę do `OWNER | EMPLOYEE`. Zamienić wolny `String` na **enum Prisma** `Role { OWNER EMPLOYEE }` (typowanie + walidacja na poziomie bazy).
2. **Migracja danych:** istniejące konta `MANAGER` → decyzja biznesowa: domyślnie `EMPLOYEE` z flagą uprawnień rozszerzonych (patrz niżej) albo `OWNER`. Zaktualizować seed (usunąć konto manager lub przemianować na „pracownik z uprawnieniami").
3. **Przyszłe uprawnienia bez nowych ról:** dodać `User.permissions Json` lub osobny model `Permission` — np. `APPROVE_VACATIONS`, `MANAGE_SCHEDULE`, `VIEW_FINANCE`, `MANAGE_INVENTORY`. To zastępuje „Managera/Księgową/Magazyniera" zestawami uprawnień **bez mnożenia ról**.
4. **Autoryzacja oparta na zdolności, nie na nazwie roli:** helper `can(user, 'APPROVE_VACATIONS')`. OWNER = wszystkie zdolności. EMPLOYEE = zdolności bazowe + ewentualnie nadane.
5. **Routing:** `/manager/*` → `/owner/*` (lub bez prefiksu, sterowane zdolnością). `managerNav` → `ownerNav`. Usunąć „przełącznik widoku" jako stałą funkcję (właściciel nie powinien „udawać" pracownika w produkcie — to może być osobny tryb podglądu).
6. **Rozpoznanie po logowaniu:** już działa — `jwt`/`session` przenoszą `role` (`auth.ts:36-55`), a `app/page.tsx` przekierowuje zalogowanego na `/dashboard`. Wystarczy rozgałęzić: OWNER → command center, EMPLOYEE → panel pracownika.

---

## 2. Inwentarz modułów (skrót — pełna tabela w `WORKOS_V2_AUDIT.md`)

- **Gotowe (działa E2E):** login, dashboard pracownika, dashboard „managera", zadania (CRUD), straty (+mock AI Vision), awarie, urlopy, powiadomienia, asystent AI (czat), powłoka + biblioteka UI.
- **Częściowe (model/API jest, UI = placeholder):** grafik, remanent, produkcja, checklisty, wiadomości, analityka, dostępność, zamiana zmian, kontrola zmiany (stan nietrwały).
- **Brak całkowity:** magazyn, receptury/BOM, zakupy, dostawcy, food cost, finanse/P&L, raporty, silnik alertów, OCR faktur, benchmarki, cyfrowy bliźniak, integracje (POS/księgowość), SOP, dashboard CEO, **AI COO**.
- **15 stron** to dosłownie ten sam placeholder „🚧 Moduł w budowie" (`schedule/page.tsx` itd.).

---

## 3. Ocena krytyczna wg Twoich 12 pytań

### Co należy PRZEPISAĆ
- **Warstwa API** — każdy route to bezpośredni `prisma.*` z `...body`. Przepisać na: walidacja (Zod) → autoryzacja (`can()`) → warstwa serwisowa. To 19 plików, ale wzorzec jest powtarzalny.
- **Kontrola zmiany (clock-in/out)** — dziś stan żyje w komponencie i ginie po odświeżeniu. Co gorsza, `AppShell.shiftActive` jest **na sztywno `false` i nigdy nie ustawiane** (`AppShell.tsx:10`), więc wskaźnik zmiany w `TopBar` to martwy kod, a `DashboardClient` trzyma **drugi, niezależny** stan zmiany. Przepisać na jedno źródło prawdy z bazy (`Shift.status='ACTIVE'`).
- **System ról** — z wolnego stringa na enum + zdolności (patrz §1).
- **Powłoka responsywna** — `AppShell` ma sztywny `w-56` sidebar bez wersji mobilnej/drawera (`AppShell.tsx:45-47`). Dla aplikacji, której pracownicy używają na telefonie, to przepisanie obowiązkowe.

### Co należy USUNĄĆ
- Rolę `MANAGER` i całą logikę `role === 'MANAGER' || 'OWNER'`.
- „Przełącznik widoku manager/pracownik" (`Sidebar.tsx:101-109`) jako stały element.
- Martwy stan zmiany w `AppShell` (po ujednoliceniu źródła prawdy).
- Zahardkodowane atrapy w dashboardzie: „Urlop 18 dni", „Zaplanowano 8:00" (`DashboardClient.tsx:80,92`) — mylą, że to działające dane.
- Mock „AI Vision" w stratach jako *finalne* rozwiązanie (zostawić jako demo, ale oznaczyć i zaplanować realny model).

### Co należy DODAĆ (krytyczne braki fundamentu)
- `middleware.ts` (jedna brama autoryzacji zamiast 20 layoutów).
- Walidacja wejścia (Zod) + whitelista pól na każdym zapisie.
- Audyt zdarzeń (kto, co, kiedy) — wymóg dla approvali i operacji finansowych.
- Rate-limiting i limity kosztów AI.
- Testy (unit dla logiki domenowej, e2e dla ścieżek krytycznych) — dziś **zero**.
- Migracje Prisma (dziś `db push` + SQLite — bez historii migracji).

### Co można UPROŚCIĆ
- **Styling:** trzy współistniejące style — klasy utility Tailwind, klasy custom w `globals.css` (`.card`, `.btn-gold`) **oraz** inline `style={{...}}` (np. `Sidebar.tsx:63`, kolory hex rozsiane po JSX). Ujednolicić do jednego systemu (tokeny + warianty komponentów). To obniży koszt każdej kolejnej strony.
- **Kolory:** te same hexy (`#6B7A8D`, `#F5F0E8`, `#E8B923`) powtórzone setki razy zamiast tokenów Tailwind. Przenieść do `tailwind.config`.
- **Role/nawigacja:** dwa zestawy nav + przełącznik → jeden zestaw sterowany zdolnościami.

### Co jest ŹLE ZAPROJEKTOWANE
- **Autoryzacja per-layout** zamiast middleware — łatwo o lukę w nowej trasie (każdy nowy `/owner/x` trzeba ręcznie chronić).
- **Brak warstwy domenowej** — reguły biznesowe (np. „kto może zatwierdzić urlop") nie istnieją; logika rozlana po route'ach.
- **Klient ufa sobie** — UI ukrywa przyciski wg roli, ale API ich nie egzekwuje (patrz §6) → ochrona wyłącznie kosmetyczna.
- **Brak izolacji multi-tenant** — `Location` istnieje, ale nic nie filtruje danych po lokalu/organizacji. Dodanie tego później = bolesny retrofit.

### Co OGRANICZA SKALOWANIE
- **SQLite** — jeden plik, brak współbieżności zapisu, brak partycjonowania; nie nadaje się pod raporty/AI/wielu najemców.
- **Brak modelu Organization/Tenant** — produkt jest dziś „jedna kawiarnia". Multi-lokal i multi-firma to fundament wyceny SaaS.
- **Agregacje liczone na żywo** w `/api/analytics` bez indeksów/materializacji — przy realnym wolumenie sprzedaży to się „zatka".
- **Brak warstwy zdarzeń/kolejek** — AI COO i alerty potrzebują przetwarzania w tle (cron/queue), którego nie ma.

### Co wygląda NIEPROFESJONALNIE
- 60% nawigacji prowadzi do identycznego „🚧 w budowie" — w demo dla inwestora/klienta to zabójcze.
- Zahardkodowane wartości udające dane (18 dni urlopu, 8:00).
- Brak stanów błędu po stronie serwera (`fetch(...).then(r => r.json())` bez obsługi błędu w wielu miejscach).
- Dane testowe niespójne (`waste-2`: `costPerUnit: 8` przy produkcie za 7).
- Brak dostępności (a11y): brak `aria-*`, brak widocznego focus-ringa.

### Co NIE MA SENSU BIZNESOWEGO (w obecnej formie)
- **Asystent AI bez danych firmy** — odpowiada ogólnikami o HACCP; nie zna sprzedaży, strat, zapasów. Dla właściciela bezwartościowy do decyzji.
- **„Straty" bez magazynu i receptur** — zgłaszamy stratę croissanta, ale system nie wie, ile mamy mąki ani jaka jest realna marża. Dane wpadają w próżnię.
- **Wiadomości 1:1** — budowanie własnego komunikatora to rozpraszanie zasobów; gastronomia korzysta z istniejących kanałów. Niska wartość vs koszt.
- **Osobny dashboard managera** — w wizji dwurolowej zbędny; energię przenieść na command center właściciela.

### Co można ZASTĄPIĆ LEPSZYM ROZWIĄZANIEM
- Ręczne `...body` → **Zod + serwisy**.
- Własny czat AI bez narzędzi → **LLM z tool-use** nad bazą (Claude `claude-opus-4-8`/`claude-sonnet-4-6`), streaming, cache, limity.
- Mock „AI Vision strat" → realny **Vision** (zdjęcie → rozpoznanie + wycena z cennika).
- Per-layout auth → **middleware + RBAC oparte na zdolnościach**.
- SQLite → **PostgreSQL** + migracje; raporty na widokach materializowanych.
- Wbudowany komunikator → integracja powiadomień (push/e-mail) zamiast własnego chatu.

---

## 4. Ocena szczegółowa modułów (stan → problem → lepsza wersja)

| Moduł | Stan | Główny problem | Lepsza wersja |
|---|---|---|---|
| **Dashboard właściciela** | Brak (jest tylko panel managera z 4 kaflami i 1 wykresem) | Pokazuje aktywności, nie pieniądze; brak sprzedaży/marży/food cost | Command center „5 pytań w 30 s": zarobek, gdzie tracę, co zamówić, najlepszy lokal, co wymaga uwagi (= Skrzynka decyzji AI COO). Szczegóły w `WORKOS_V2_AUDIT.md §7`. |
| **Dashboard pracownika** | Gotowy, ładny | Stan zmiany nietrwały; atrapy danych; brak „co dziś robię" w jednym widoku | Trwały clock-in, dzisiejszy grafik + checklisty + zadania + 1 akcja AI; tryb mobilny/kiosk |
| **UX** | 6/10 | Ścieżki kończą się w „w budowie"; brak onboardingu, pustych-stanów z akcją | Progresywne odkrywanie, onboarding właściciela (cele food cost/labor), puste stany prowadzące do akcji |
| **UI** | 8/10 | Spójny, ale 3 systemy stylów + hexy inline; brak a11y i responsywności powłoki | Tokeny designu, warianty komponentów, mobile drawer, focus states, WCAG AA |
| **AI COO** | Brak (jest tylko czat) | Nie zamienia danych w decyzje | Pętla Obserwuj→Analizuj→Rekomenduj→Działaj→Ucz się + tool-use + Skrzynka decyzji. Spec w `WORKOS_V2_AUDIT.md §8` |
| **Magazyn** | Brak | Bez niego straty/food cost/zakupy nie mają sensu | Model `InventoryItem` (stan, min/max, jednostki, lokal) + ruchy magazynowe (przyjęcie/zużycie/strata/korekta) |
| **Receptury (BOM)** | Brak (tylko `Product.costPerUnit`) | Nie da się policzyć teoretycznego food cost ani zużycia | `Recipe` → `RecipeItem` (składnik, ilość, jednostka); powiązanie z produkcją i sprzedażą |
| **Food cost** | Brak | Serce ekonomiki lokalu nieobecne | Teoretyczny (z receptur×ceny) vs rzeczywisty (zużycie z magazynu) → **wariancja** = wykrywanie kradzieży/błędów porcji |
| **Produkcja** | API jest, UI brak | Nie odejmuje składników z magazynu | Produkcja zużywa BOM → automatyczny ruch magazynowy + koszt |
| **Straty** | Gotowe (zgłaszanie) | Izolowane od magazynu; koszt z `...body` (manipulowalny) | Strata = ruch magazynowy z wyceną z cennika; kategorie i trendy; foto-dowód |
| **Harmonogram (grafik)** | Modele są, UI brak | Brak planowania, kosztu pracy, dostępności | Kreator grafiku: dostępność + kompetencje + prognoza ruchu → koszt pracy % w czasie rzeczywistym; publikacja + powiadomienia; zamiana zmian |
| **Raporty** | 1 endpoint agregacji | Brak okresów, lokali, eksportu | Raporty P&L/sprzedaż/labor/food cost z filtrem okres×lokal, eksport CSV/PDF, harmonogram e-mail |
| **Analityka** | Placeholder + endpoint | Liczy na żywo, brak roli, brak segmentacji | Warstwa metryk (materializowana), trendy vs poprzedni okres, drill-down |
| **Alerty** | Brak (tylko `Notification`) | Reaktywne powiadomienia, nie proaktywne reguły | Silnik reguł + progi celów + cron → alerty z akcją (wkład do AI COO) |
| **Integracje** | Brak | Bez POS nie ma sprzedaży = brak finansów/food cost | Konektory POS (sprzedaż), KSeF/e-faktury, księgowość, bankowość; webhooki + publiczne API |
| **Bezpieczeństwo** | 3/10 | IDOR, brak RBAC na zapisie, mass-assignment | §6 |
| **Architektura** | 5/10 | Brak warstwy domenowej, middleware, multi-tenant | Serwisy domenowe + RBAC + Organization/Tenant |
| **Baza danych** | 4/10 | SQLite, brak enumów/indeksów/tenant/migracji | PostgreSQL + enumy + indeksy + `Organization`/`Location` jako oś izolacji |
| **API** | 4/10 | `...body`, brak walidacji/wersjonowania/paginacji | Zod + serwisy + paginacja + spójny kontrakt błędów |
| **Wydajność** | — | Agregacje na żywo, brak cache, refetch co 30/60 s globalnie | Metryki materializowane, cache, websockety/SSE zamiast pollingu |
| **Responsywność** | 4/10 | Powłoka niemobilna (sztywny sidebar) | Mobile-first shell + tryb kiosk dla pracownika na zmianie |

---

## 5. Bezpieczeństwo — konkretne podatności (z lokalizacją)

| # | Podatność | Dowód | Skutek |
|---|---|---|---|
| 1 | **Samo-zatwierdzanie urlopu** — brak kontroli roli, `...body`, `approvedBy` ustawiane z sesji | `api/vacations/[id]/route.ts:10-12` | Każdy pracownik akceptuje swój urlop |
| 2 | **IDOR na zmianach (odczyt)** — `?userId=` nadpisuje siebie | `api/shifts/route.ts:10` | Podgląd cudzych grafików |
| 3 | **Mass-assignment na zmianach (zapis)** — `data: body` w całości | `api/shifts/route.ts:23` | Tworzenie zmian dla dowolnego usera/lokalu |
| 4 | **IDOR na zadaniach** — PATCH/DELETE bez sprawdzenia właściciela | `api/tasks/[id]/route.ts` | Edycja/usuwanie cudzych zadań |
| 5 | **Mass-assignment globalnie** — `...body`/`...item` | tasks, waste, incidents, inventory, production, vacations (POST) | Nadpisywanie `status`, `costPerUnit`, `totalCost` |
| 6 | **Brak RBAC na danych zbiorczych** — `/api/users`, `/api/analytics` | `api/users/route.ts:9`, `api/analytics/route.ts:6` | Pracownik widzi listę wszystkich (e-maile) i globalne finanse |
| 7 | **AI bez limitów** — brak rate-limit/limitu kosztów, historia z klienta | `api/ai/route.ts` | Nadużycie kosztów, wstrzyknięcie kontekstu |
| 8 | **Brak audytu/logów** | całość | Brak śladu kto zatwierdził/usunął |
| 9 | **JWT bez natychmiastowego odwołania** | `auth.ts:58` | Trudne cofnięcie uprawnień do czasu wygaśnięcia |

Priorytet napraw: **1, 3, 5 (krytyczne) → 2, 4, 6 → 7, 8, 9.**

---

## 6. Propozycje własne (Senior PM) — poza Twoją listą

### 6A. Funkcje, których brakuje, a są oczekiwane w kategorii
- **Integracja POS jako rdzeń** — bez strumienia sprzedaży nie ma food cost, P&L ani prognoz. To warunek bycia „OS", a nie aplikacją pracowniczą.
- **Theoretical vs Actual food cost** (wariancja) — flagowa funkcja systemów BOH (Crunchtime), u nas wzmocniona AI: automatyczne wykrywanie kradzieży/przeporcjowania.
- **Prognoza popytu** (dzień tygodnia, sezonowość, pogoda, wydarzenia) → napędza grafik, zakupy i produkcję.
- **Optymalizacja grafiku do prognozy** — koszt pracy % sterowany przewidywanym ruchem; alert „przeszacowana/niedoszacowana obsada".
- **Zarządzanie wygasaniem i FIFO/HACCP** — partie, terminy, temperatury, dziennik HACCP (wymóg sanepidu w PL/EU).
- **Cash & tip management**, kontrola rozliczeń kasy (różnice kasowe jako sygnał).

### 6B. Funkcje zwiększające wartość (monetyzacja / retencja)
- **Skrzynka decyzji** z policzonym **wpływem finansowym** każdej rekomendacji (właściciel widzi „ile to warte").
- **Cotygodniowy AI-przegląd biznesu** (e-mail/PDF): co poszło dobrze/źle + 3 rekomendacje. Buduje nawyk i retencję.
- **Cele i alerty progowe** definiowane przez właściciela (food cost <30%, labor <28%).
- **Mobilny tryb pracownika / kiosk** (clock-in QR, checklisty, zgłoszenia) — codzienne użycie = lepka adopcja.
- **Marketplace dostawców / auto-zamówienia** — prowizja od wolumenu zakupów jako dodatkowy strumień przychodu.

### 6C. Wyróżniki vs Toast / Square / Lightspeed / GoPOS / Oracle Micros / Crunchtime
Konkurenci są **POS-first** (Toast, Square, Lightspeed, GoPOS, Oracle Micros) lub **enterprise BOH-first i drogie/złożone** (Crunchtime, Oracle). Żaden nie jest **AI-native i decyzyjny**. Przewagi WorkOS:

1. **Decision-first, nie report-first** — konkurenci dają pulpity z liczbami; WorkOS daje **decyzje z akcją** (Skrzynka decyzji). To zmiana kategorii: z „BI" na „COO".
2. **Język naturalny nad całym biznesem** — „dlaczego marża spadła w maju?" → AI sięga po dane (tool-use) i odpowiada liczbami + rekomendacją. Konkurenci wymagają budowania raportów.
3. **Jedna pętla danych** sprzedaż→receptury→magazyn→zakupy→praca→P&L — Toast/Square widzą głównie sprzedaż; Crunchtime BOH bez warstwy AI.
4. **Moat lokalny PL/EU** — natywne **KSeF (e-faktury), JPK, ZUS/PPK, HACCP**. Globalni gracze wchodzą tu wolno; GoPOS jest lokalny, ale nie AI-native.
5. **OCR faktur → magazyn → ceny → food cost** automatycznie — zamyka pętlę zakupową bez ręcznego wpisywania.
6. **Cyfrowy bliźniak / symulacje „co-jeśli"** — „co jeśli podniosę ceny o 5% i zmienię dostawcę masła?" → prognoza P&L. Nikt w segmencie SMB tego nie ma.
7. **Efekt sieci z benchmarków** — anonimowe porównania między lokalami (Twój food cost vs podobne lokale w mieście). Wartość rośnie z bazą klientów — bariera wejścia.
8. **Mobile-first dla pracownika + command center dla właściciela** w jednym — konkurenci rozbijają to na osobne, drogie moduły.

---

## 7. Roadmapa do wdrożenia komercyjnego (z uzasadnieniem etapów)

> Zasada: najpierw **utwardzić fundament i model danych**, bo na nim stoi cała wartość AI. Potem **domknąć pętlę pieniędzy** (POS→food cost), bo to uzasadnia cenę. AI COO i wyróżniki na końcu — dają przewagę, ale potrzebują danych.

### Etap 0 — Utwardzenie fundamentu *(warunek wstępny; ~2–3 tyg.)*
Zakres: dwie role (enum + zdolności), `middleware.ts` + RBAC, naprawa podatności §5 (1,3,5 → reszta), Zod + serwisy, trwały clock-in, audyt zdarzeń, rate-limit, **PostgreSQL + migracje**, model `Organization/Tenant`, podstawowe testy.
**Uzasadnienie:** bez tego każdy nowy moduł powiela luki bezpieczeństwa i dług; multi-tenant i baza muszą powstać przed danymi, bo retrofit jest dramatycznie droższy. To nie jest „przebudowa od zera" — to utwardzenie istniejącego szkieletu.

### Etap 1 — Domknięcie panelu pracownika + dashboard właściciela MVP *(~3–4 tyg.)*
Zakres: dokończyć moduły na istniejących modelach (grafik „mój", godziny pracy, dostępność, checklisty, produkcja, remanent, zamiana zmian, SOP), responsywna powłoka mobilna, **dashboard właściciela** na realnych danych (straty, praca, zadania, urlopy z RBAC), porządki UI (tokeny, a11y).
**Uzasadnienie:** szybko likwiduje „60% w budowie", daje sprzedawalne demo i codzienną adopcję pracowników (lepkość), zanim wejdą ciężkie moduły.

### Etap 2 — Pętla pieniędzy: magazyn + receptury + food cost + POS *(~5–6 tyg.)*
Zakres: `InventoryItem` + ruchy magazynowe, `Recipe/BOM`, produkcja i straty jako ruchy magazynowe, **integracja POS** (sprzedaż), **food cost teoretyczny vs rzeczywisty (wariancja)**, zakupy + dostawcy.
**Uzasadnienie:** to moment, w którym produkt przestaje być aplikacją pracowniczą, a staje się systemem ekonomiki lokalu — uzasadnia cenę i tworzy dane dla AI. Wariancja food cost to natychmiastowy, mierzalny ROI dla właściciela.

### Etap 3 — AI COO + alerty + raporty *(~5–6 tyg.)*
Zakres: warstwa metryk (materializowana) + silnik reguł/alertów (cron), **AI COO** (Skrzynka decyzji z wpływem finansowym), **AI Chat z tool-use** nad bazą, prognozy popytu/obsady, raporty P&L/labor/food cost z eksportem, cotygodniowy AI-przegląd.
**Uzasadnienie:** dopiero teraz są dane, na których AI generuje realne decyzje. To rdzeń różnicujący i główny argument sprzedażowy „AI COO".

### Etap 4 — Integracje i moat lokalny *(~4–6 tyg.)*
Zakres: **OCR faktur → magazyn**, **KSeF/e-faktury, JPK**, księgowość/bankowość, optymalizacja grafiku do prognozy, publiczne API + webhooki.
**Uzasadnienie:** zamyka pętlę zakupową i buduje barierę regulacyjną PL/EU, której globalni konkurenci nie mają; redukuje pracę ręczną właściciela do zera.

### Etap 5 — Skalowanie i przewaga kategoryjna *(ciągłe)*
Zakres: pełny multi-lokal/multi-tenant, **benchmarki** (efekt sieci), **cyfrowy bliźniak** (symulacje co-jeśli), wydajność (cache/kolejki/hurtownia danych, SSE zamiast pollingu), observability, plany cenowe i onboarding samoobsługowy.
**Uzasadnienie:** zamienia produkt w platformę z efektami sieci i wyceną SaaS skalowaną per-lokal — to etap budowy wartości „setek milionów".

---

## 8. Trzy rzeczy do zrobienia w tym tygodniu (gdyby trzeba wybrać)
1. **Naprawić krytyczne podatności** (§5 #1, #3, #5) + dodać `middleware.ts`. Bez tego nie wolno pokazywać produktu klientowi.
2. **Uprościć role do OWNER/EMPLOYEE** (enum + zdolności) — odblokowuje docelowy model dwóch widoków.
3. **Zaprojektować model danych pętli pieniędzy** (Organization/Tenant + InventoryItem + Recipe/BOM) i przejść na PostgreSQL — fundament pod food cost i AI COO.

> Wszystkie powyższe to praca **na istniejącym kodzie** (rozszerzenie schematu, utwardzenie API, dokończenie stron), nie tworzenie nowego projektu ani przepisywanie architektury od zera.
