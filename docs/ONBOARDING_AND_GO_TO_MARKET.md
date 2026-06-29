# RestaurantOS — Przewodnik wdrożenia + Plan pilotażu

Kompletny przewodnik dla **nowego dewelopera**: od zera do uruchomienia lokalnego,
przez produkcję, testy i weryfikację każdego modułu — oraz **plan pozyskania
pierwszego klienta pilotażowego** i wdrożenia w prawdziwej restauracji.

---

# CZĘŚĆ 1 — Uruchomienie lokalne (od zera)

## 1.1 Wymagania wstępne
- **Node.js 20+** (`node -v`)
- **PostgreSQL 14+** (lokalnie lub w Dockerze)
- **git**
- (opcjonalnie) klucz **Anthropic API** — dla AI COO / OCR / asystenta. Bez klucza moduły AI działają w trybie regułowym.

## 1.2 Klonowanie i zależności
```bash
git clone https://github.com/basen9/restaurantos.git
cd restaurantos
npm install
```

## 1.3 PostgreSQL
Opcja A — lokalny serwer:
```bash
sudo service postgresql start
sudo -u postgres psql -c "CREATE USER workos WITH PASSWORD 'workos' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE workos OWNER workos;"
```
Opcja B — Docker:
```bash
docker run --name ros-pg -e POSTGRES_USER=workos -e POSTGRES_PASSWORD=workos \
  -e POSTGRES_DB=workos -p 5432:5432 -d postgres:16
```

> Uwaga: `prisma migrate dev` tworzy tymczasową „shadow DB", dlatego użytkownik bazy
> musi mieć uprawnienie `CREATEDB` (powyżej). Na produkcji używamy `migrate deploy`, które tego nie wymaga.

## 1.4 Zmienne środowiskowe
```bash
cp .env.example .env
```
Uzupełnij `.env` (szczegóły w CZĘŚCI 3):
```
DATABASE_URL="postgresql://workos:workos@localhost:5432/workos?schema=public"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY=""        # opcjonalnie
CRON_SECRET="<długi losowy ciąg>"
```

## 1.5 Migracje + dane demo
```bash
npx prisma migrate deploy     # zakłada schemat (9 migracji)
node prisma/seed.js           # konta + dane przykładowe
npx prisma generate           # klient Prisma (zwykle robi to install)
```

## 1.6 Start
```bash
npm run dev                   # tryb deweloperski (hot reload)
# lub produkcyjnie lokalnie:
npm run build && npm run start
```
Otwórz **http://localhost:3000**.

## 1.7 Konta testowe (po seedzie)
| Rola | Email | Hasło | Co zobaczysz |
|------|-------|-------|--------------|
| OWNER | owner@workos.pl | owner123 | Pełny panel właściciela (`/owner/*`) |
| EMPLOYEE (kierownik) | lead@workos.pl | lead123 | Panel pracownika + rozszerzone uprawnienia |
| EMPLOYEE | anna@workos.pl | anna123 | Podstawowy panel pracownika |

> Po zalogowaniu router kieruje wg roli: OWNER → `/` (centrum dowodzenia), EMPLOYEE → `/dashboard`.

---

# CZĘŚĆ 2 — Wdrożenie produkcyjne

## 2.1 Architektura docelowa
- **App:** Next.js 14 (Node runtime) — np. Vercel, Railway, Render, Fly.io lub własny VPS/Docker.
- **Baza:** zarządzany PostgreSQL (Neon, Supabase, RDS, Railway). **Nie SQLite.**
- **AI:** Anthropic API (klucz w env).
- **Cron:** zewnętrzny scheduler wołający endpoint silnika alertów (poniżej).

## 2.2 Procedura wdrożenia
```bash
npm ci
npx prisma migrate deploy          # migracje (NIE 'migrate dev' na prod)
npm run build
npm run start                      # lub proces zarządzany (pm2 / systemd / kontener)
```
Dane demo seedujemy **tylko** na środowisku stagingowym, nie na produkcji z realnym klientem.

## 2.3 Hosting — szybkie ścieżki
- **Vercel + Neon:** połącz repo, ustaw env, dodaj build command `prisma migrate deploy && next build`.
- **Docker/VPS:** `Dockerfile` z `npm ci && npm run build`, start `npm run start`; PostgreSQL osobno; reverse proxy (nginx/Caddy) z TLS.

## 2.4 Cron — silnik alertów
Endpoint `POST /api/alerts/run` w trybie cron przelicza alerty dla **wszystkich** organizacji:
```bash
curl -X POST https://twojadomena.pl/api/alerts/run \
  -H "x-cron-secret: $CRON_SECRET"
```
Zaplanuj np. co 1–4 h (Vercel Cron, GitHub Actions schedule, systemd timer).
Tryb interaktywny (właściciel z `org.manage`) działa też z panelu.

## 2.5 Backup / Recovery
```bash
DATABASE_URL=... ./scripts/backup.sh ./backups     # pg_dump, retencja 14
DATABASE_URL=... ./scripts/restore.sh backups/workos_YYYYMMDD_HHMMSS.dump
```
Zalecenie: codzienny cron `backup.sh` + kopia off-site. Przetestuj restore przed go-live.

## 2.6 Monitoring i logi
- **Health-check:** `GET /api/health` → `{status, db}`, 503 gdy baza niedostępna. Podłącz pod uptime monitor / liveness probe.
- **Logi:** structured JSON (`lib/logger.ts`) na stdout → agregator (Datadog/Logtail/CloudWatch).
- **Audyt:** tabela `AuditLog` rejestruje operacje wrażliwe.
- **Sentry (opcjonalnie):** podłączyć w `handle()` (jeden punkt przechwytywania wyjątków).

## 2.7 Bezpieczeństwo produkcyjne (checklista)
- [ ] `NEXTAUTH_SECRET` silny i losowy (nie z `.env.example`).
- [ ] `CRON_SECRET` długi i tajny.
- [ ] HTTPS wymuszony; nagłówki bezpieczeństwa w `next.config.js`.
- [ ] Baza niedostępna publicznie (tylko z aplikacji).
- [ ] Rate-limiter: in-memory wystarcza dla 1 instancji; przy skalowaniu poziomym → Redis (`lib/ratelimit.ts`).
- [ ] Backup zweryfikowany (restore testowy).

---

# CZĘŚĆ 3 — Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---------|:---:|------|
| `DATABASE_URL` | ✅ | Connection string PostgreSQL. Format: `postgresql://user:pass@host:5432/db?schema=public` |
| `NEXTAUTH_SECRET` | ✅ | Sekret podpisu sesji JWT, min. 32 znaki. Generuj: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Publiczny URL aplikacji (np. `https://app.twojarestauracja.pl`) |
| `ANTHROPIC_API_KEY` | ⬜ | Klucz Claude API. Bez niego: AI COO/OCR/asystent w trybie regułowym |
| `CRON_SECRET` | ⬜* | Sekret dla crona alertów (`x-cron-secret`). Wymagany jeśli używasz automatycznych alertów |

\* Bez `CRON_SECRET` automatyczne przeliczanie alertów dla wszystkich org jest wyłączone; tryb interaktywny działa.

---

# CZĘŚĆ 4 — Testy i weryfikacja każdego modułu

## 4.1 Automatyczne (cały zestaw)
```bash
npm run test          # vitest — testy jednostkowe (funkcje czyste): 23 testy
npx tsc --noEmit      # typecheck — zero błędów
npm run build         # build produkcyjny
# w osobnym terminalu, po seedzie i starcie serwera:
npm run smoke         # integracyjne API/RBAC: 39 sprawdzeń (oczekiwane 39 PASS / 0 FAIL)
npm run test:e2e      # Playwright E2E: logowanie wg roli, blokada /owner dla EMPLOYEE
```
Te same kroki uruchamia **CI** (`.github/workflows/ci.yml`) na każdym PR.

## 4.2 Smoke — co weryfikuje
`scripts/smoke.sh` loguje się jako OWNER i EMPLOYEE, po czym sprawdza kody odpowiedzi
wszystkich kluczowych stron oraz **RBAC** (EMPLOYEE nie wchodzi na `/owner/*`).

## 4.3 Ręczna weryfikacja modułów (checklista akceptacyjna)

### Panel właściciela (zaloguj jako owner@workos.pl)
| Moduł | Ścieżka | Jak zweryfikować, że działa |
|-------|---------|------------------------------|
| Dashboard | `/` | KPI (przychód, food cost, koszt pracy, zysk), filtr lokalu, wykresy ładują się < kilka s |
| AI COO | `/owner/coo` | Zadaj pytanie (np. „gdzie tracę pieniądze?") — odpowiedź z danymi; bez klucza API: rekomendacje regułowe |
| Alerty | `/owner/alerts` | Lista alertów; przycisk przeliczenia tworzy/aktualizuje alerty bez duplikatów |
| Analityka | `/owner/analytics` | Sprzedaż POS, koszt pracy, marża, wykresy |
| Magazyn | `/owner/warehouse` | Pozycje, stany, dostawcy, ruchy stanów |
| Faktury (OCR+KSeF) | `/owner/invoices` | Import (mock KSeF) / dodanie faktury → dopasowanie pozycji → po zatwierdzeniu aktualizują się ceny zakupu i stany |
| Receptury / food cost | `/owner/recipes` | Koszt/szt, food cost %, marża; widok wariancji (teoria vs rzeczywistość) |
| Grafik (smart) | `/owner/schedule` | Prognoza ruchu, rekomendacja obsady, wykrycie luk pokrycia |
| Lokale | `/owner/locations` | Ranking rentowności lokali |
| Raporty | `/owner/reports` | Eksport CSV: sprzedaż / straty / magazyn / food cost (plik się pobiera) |
| Zespół | `/owner/employees` | Lista; modal uprawnień zapisuje zestawy (np. „kierownik zmiany") |
| Zadania/urlopy/straty/awarie | `/owner/{tasks,vacations,waste,incidents}` | Tworzenie/zatwierdzanie działa |

### Panel pracownika (zaloguj jako anna@workos.pl)
| Moduł | Ścieżka | Weryfikacja |
|-------|---------|-------------|
| Dashboard / zmiana | `/dashboard` | Start/stop zmiany, timer w czasie rzeczywistym |
| Grafik / czas / dostępność | `/schedule`, `/time`, `/availability` | Podgląd grafiku, rejestr czasu, ustawienie dostępności |
| Zadania / checklisty / produkcja / remanent | `/tasks`, `/checklists`, `/production`, `/inventory` | Wykonanie zadania, checklist, produkcja zdejmuje stan |
| Straty / awarie / urlopy | `/waste`, `/incidents`, `/vacation` | Zgłoszenie tworzy rekord |
| SOP / wyniki / asystent / wiadomości | `/sop`, `/performance`, `/assistant`, `/messages` | Procedury, statystyki, czat AI, wiadomości |

### Weryfikacja RBAC i izolacji (krytyczne dla bezpieczeństwa)
- Jako EMPLOYEE wejdź ręcznie na `/owner` → **przekierowanie** (brak dostępu).
- Jako EMPLOYEE wywołaj endpoint właścicielski (np. `/api/users`) → **403**.
- Wszystkie zapytania filtrowane po `organizationId` (multi-tenant) — dane innej organizacji niewidoczne.

## 4.4 Definicja „zielonego" wydania
`tsc` ✅ · vitest ✅ · build ✅ · smoke **39/0** ✅ · E2E ✅ · ręczna checklista modułów ✅.

---

# CZĘŚĆ 5 — Plan pozyskania pierwszego klienta pilotażowego

Cel: **1 prawdziwa restauracja** używająca systemu produkcyjnie w 4–6 tygodni,
generująca referencję i case study.

## 5.1 Profil idealnego pilota (ICP)
- 1–3 lokale (na tyle duże, by mieć ból z food cost i grafikiem; na tyle małe, by decyzja była szybka).
- Właściciel zaangażowany operacyjnie (sam patrzy na liczby).
- Istniejący POS (sprzedaż do analizy) i faktury od dostawców (do OCR/food cost).
- Ból, który adresujemy: „nie wiem, gdzie tracę pieniądze", chaos w grafikach, rozjazd food cost.

## 5.2 Propozycja wartości (jedno zdanie)
„RestaurantOS w 30 sekund pokazuje właścicielowi, **ile zarobił, gdzie traci, który lokal jest rentowny,
co zamówić i co wymaga uwagi** — a AI COO podpowiada decyzje."

## 5.3 Pozyskanie — kanały (priorytet)
1. **Ciepła sieć** — znajomi restauratorzy, polecenia. Najszybsza konwersja na pilota.
2. **Bezpośredni outreach** — 20–30 lokalnych restauracji; krótki e-mail/wizyta + 15-min demo.
3. **Grupy branżowe** (FB/LinkedIn gastronomia, lokalne zrzeszenia) — post z konkretem (oszczędność food cost).
4. **Dostawcy/księgowi gastro** jako kanał poleceń.

Materiały: 1-stronicowy one-pager (5 pytań + screen dashboardu), 5-min demo na danych seed.

## 5.4 Oferta pilotażowa
- **Darmowy lub mocno zniżkowy pilot 60 dni** w zamian za: feedback, dane do kalibracji, zgodę na case study/referencję.
- Jasne kryteria sukcesu (poniżej) i konkretny opiekun (founder) na czacie/telefonie.
- Wyraźny warunek konwersji: po pilocie cena X zł/mies./lokal, jeśli kryteria spełnione.

## 5.5 Onboarding restauracji (krok po kroku)
1. **Setup tenanta:** utwórz organizację + konto OWNER (osobny seed/skrypt produkcyjny, bez danych demo).
2. **Lokale i zespół:** dodaj lokal(e), zaimportuj pracowników, nadaj zestawy uprawnień (kierownik zmiany itp.).
3. **Magazyn i dostawcy:** wprowadź pozycje magazynowe, ceny zakupu, dostawców.
4. **Receptury:** dodaj kluczowe dania → policz food cost i marżę.
5. **Sprzedaż (POS):** import sprzedaży (na start CSV/ręcznie; realny konektor POS = praca wdrożeniowa).
6. **Faktury:** przetestuj OCR na realnych fakturach; KSeF na start w trybie mock/ręcznym.
7. **Alerty + cron:** włącz `CRON_SECRET` i harmonogram `/api/alerts/run`.
8. **Szkolenie:** 60-min sesja z właścicielem (dashboard + COO) i 30-min z zespołem (panel pracownika).
9. **Backup:** włącz codzienny `backup.sh`.

## 5.6 Kryteria sukcesu pilota (mierzalne)
- Właściciel loguje się ≥ 4×/tydz. i używa dashboardu do decyzji.
- Co najmniej **10 faktur** przetworzonych (OCR/ręcznie) i food cost policzony dla top 10 dań.
- Grafik ułożony w systemie na ≥ 4 tygodnie.
- Wykryta i potwierdzona ≥ 1 realna oszczędność (food cost / nadgodziny / strata).
- NPS/feedback właściciela ≥ 8/10; zgoda na referencję.

## 5.7 Pętla feedbacku → produkt
- Cotygodniowy 30-min call: co działa, co przeszkadza, czego brakuje.
- Bugi i braki → backlog (priorytet: blokery codziennego użycia).
- Po 60 dniach: decyzja konwersji + spisane case study (liczby przed/po).

## 5.8 Ryzyka i mitygacje
| Ryzyko | Mitygacja |
|--------|-----------|
| Brak realnego konektora POS | Start na imporcie CSV/ręcznym; konektor jako kolejny etap wdrożenia |
| KSeF w trybie mock | Faktury ręcznie/OCR; realny KSeF po zdobyciu poświadczeń |
| Niska adopcja zespołu | Krótkie szkolenie + prosty panel pracownika; właściciel jako sponsor |
| Jakość danych (ceny, receptury) | Wspólny setup z właścicielem w tygodniu 1 |
| Skalowanie/limiter | Pilot = 1 instancja (OK); Redis przy wielu instancjach |

## 5.9 Harmonogram (6 tygodni)
- **Tydz. 0:** wybór pilota, podpisanie warunków, setup tenanta + środowiska.
- **Tydz. 1:** onboarding danych (lokale, zespół, magazyn, receptury), szkolenie.
- **Tydz. 2–5:** użycie produkcyjne, cotygodniowy feedback, iteracje.
- **Tydz. 6:** podsumowanie, case study, decyzja konwersji + plan rolloutu.

---

## Dodatek — szybki start (TL;DR)
```bash
git clone https://github.com/basen9/restaurantos.git && cd restaurantos
npm install && cp .env.example .env      # uzupełnij DATABASE_URL + NEXTAUTH_SECRET
npx prisma migrate deploy && node prisma/seed.js
npm run dev                              # http://localhost:3000 → owner@workos.pl / owner123
```
