# RestaurantOS v1.0 — Notatki wydania

**Data:** 2026-06-29
**Status:** gotowe do komercyjnego wdrożenia (production-ready)

RestaurantOS v1.0 to AI Operating System dla gastronomii — od panelu pracownika,
przez pełną pętlę food cost, po AI COO i analitykę wielu lokali.

---

## Zakres v1.0

### Fundament (Etap 0–2)
- Migracja SQLite → **PostgreSQL** (multi-tenant: `Organization` + `organizationId` wszędzie).
- **RBAC po uprawnieniach** (`lib/permissions.ts`) — dwie role OWNER/EMPLOYEE, reszta jako zestawy uprawnień.
- Wspólna warstwa API (`lib/api.ts`): `handle`, `requireAuth`/`requirePermission`, `parseBody` (Zod),
  `orgScope` (izolacja najemcy), `enforceRateLimit`, `ApiError`, logger JSON.
- Usunięcie podatności: `npm audit` (prod) zredukowany do 1 residual high (Next — wymaga majora, mitygowany RBAC na poziomie API).

### Dashboard właściciela
- Ekran odpowiadający w 30 s na 5 pytań: ile zarobiłem / gdzie tracę / który lokal rentowny /
  co zamówić / co wymaga uwagi. Filtr lokalu, KPI, wykresy.

### Pętla pieniądza
- Magazyn, dostawcy, ruchy stanów; receptury i food cost; produkcja (rozchód stanu);
  sprzedaż POS; przychód/marża/food cost/koszt pracy/zysk; **wariancja food cost**
  (teoretyczny vs rzeczywisty rozchód).

### Moduły premium
1. **AI COO Premium** — agentowy doradca (tool-use Claude, 6 narzędzi: sprzedaż, koszt pracy,
   stan magazynu, wariancja, straty, elementy wymagające uwagi); tryb regułowy bez klucza API.
2. **OCR faktur + KSeF** — odczyt faktur (Claude Vision), import KSeF (mock provider),
   dopasowanie pozycji do magazynu, auto-aktualizacja cen zakupu i stanów po zatwierdzeniu.
3. **Inteligentny grafik** — prognoza ruchu (avg po dniu tygodnia), rekomendacja obsady,
   automatyczne przydzielanie, wykrywanie luk w pokryciu.
4. **Wiele lokali** — analityka i ranking rentowności lokali (`lib/locationAnalytics.ts`).

### Self-service pracownika i operacje
- Dostępność, SOP, checklisty, produkcja, remanent, zadania, straty, awarie, urlopy,
  wiadomości, powiadomienia, wyniki, asystent AI.

### Alerty i audyt
- Silnik alertów (`lib/alertsEngine.ts`) — reguły, deduplikacja (`dedupeKey`), idempotencja,
  powiadomienia właścicieli.
- `AuditLog` na mutacjach; rate limiting; structured logging.

### Raporty
- Eksport CSV: sprzedaż, straty, magazyn, food cost (`/api/reports/export`).

### Infrastruktura wydania (Etap D)
- **CI** (`.github/workflows/ci.yml`): PostgreSQL service, migrate deploy, vitest, tsc, build,
  seed, start + smoke integracyjny na każdym PR.
- Sesja JWT **8 h** (`maxAge`) — ogranicza okno nieaktywności zmienionych uprawnień.
- Dostępność: style `:focus-visible`.

---

## Weryfikacja

| Kontrola | Wynik |
|----------|-------|
| `npx tsc --noEmit` | ✅ bez błędów |
| `npm run test` (vitest) | ✅ |
| `npm run build` | ✅ |
| `npm run smoke` (API/RBAC) | ✅ |
| `npm run test:e2e` (Playwright) | ✅ |

---

## Znane ograniczenia / poza zakresem v1.0

Świadomie odroczone (wymagają zewnętrznej infrastruktury lub poświadczeń, lub stanowią
funkcje przyszłej wersji premium):

- **Realne konektory POS / KSeF** — obecnie mock; produkcyjna integracja wymaga poświadczeń
  i certyfikatów zewnętrznych dostawców.
- **Migracja Next 16 (major)** — 1 residual high w `npm audit`; mitygowany RBAC na poziomie API.
- **Redis dla rate limitera** — obecny limiter in-memory wystarcza dla pojedynczej instancji;
  multi-instance wymaga współdzielonego store.
- **Publikacja grafiku DRAFT → PUBLISHED**, prognoza godzin szczytu, benchmark sieci,
  digital twin, voice ops — roadmapa post-1.0.

Szczegóły i uzasadnienie biznesowe: [`SUGGESTIONS.md`](../SUGGESTIONS.md).

---

## Konta testowe

| Rola | Email | Hasło |
|------|-------|-------|
| OWNER | owner@workos.pl | owner123 |
| EMPLOYEE (kierownik) | lead@workos.pl | lead123 |
| EMPLOYEE | anna@workos.pl | anna123 |
