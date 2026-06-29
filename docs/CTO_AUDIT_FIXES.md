# Niezależny audyt CTO — znaleziska i naprawy

**Data:** 2026-06-29 · **Zakres:** cały kod (bezpieczeństwo, skalowanie/wydajność, poprawność/architektura, UX)
**Metoda:** 4 niezależne przebiegi audytowe + weryfikacja adwersarialna własnych poprawek.

Werdykt wejściowy: kod jest solidnie zbudowany (spójna warstwa API, izolacja tenanta, brak
klasycznego IDOR/SQLi/XSS). Poniżej znaleziska **naprawione w tym przebiegu** oraz lista
ograniczeń, które pozostają **wyłącznie z powodu braku dostępu do usług zewnętrznych**.

---

## 1. Poprawność / pętla pieniądza (krytyczne)

| # | Problem | Naprawa |
|---|---------|---------|
| H1 | `productCostMap` zerował koszt produktu, gdy receptura miała składniki bez ceny → COGS=0, marża ~100%, alert food cost nie odpalał | `lib/finance.ts`: nadpisujemy fallback `Product.costPerUnit` tylko gdy `per > 0` |
| H2 | `confirmInvoice` — guard idempotencji poza transakcją → dwa równoległe zatwierdzenia podwajały stan i nadpisywały cenę 2× | `lib/invoiceService.ts`: atomowy `updateMany({status:'PENDING'→'CONFIRMED'})` wewnątrz transakcji; przy `count===0` brak ponownego przyjęcia. Ruchy magazynowe jednym `createMany` |
| H3 | Ręczny restock magazynu: read-modify-write + dwa zapisy bez transakcji → utrata aktualizacji i rozjazd ruchy↔stan | `app/api/inventory-items/[id]`: `$transaction` + atomic `{ increment }` |
| H4 | Współbieżne „start zmiany" tworzyło dwie zmiany ACTIVE → podwójny koszt pracy | `app/api/shifts/clock`: `$transaction` + guard istniejącej zmiany ACTIVE (idempotentnie) |
| M1 | Dwie rozjeżdżające się kopie `shiftMinutes` (jedna rzucała na `null`) | Jedno źródło — `shiftMinutes` eksportowane z `lib/finance.ts`, używane w `locationAnalytics` |
| M2 | `laborCost` zaokrąglał do pełnych złotych (`Math.round`) zamiast groszy | `round2` |
| M3 | `matchInvoiceLines` brał pierwsze zawieranie podłańcucha → błędne mapowanie cen/stanu na złą pozycję | Ranking najlepszego dopasowania; pojedynczy wspólny token i słabe zawieranie nie wystarczają (zostają do ręcznego potwierdzenia). Testy regresyjne |

## 2. Bezpieczeństwo

| # | Problem | Naprawa |
|---|---------|---------|
| S1 | `supplierId` z body zapisywany bez walidacji właściciela → cross-tenant (wyciek nazwy dostawcy w eksporcie) | Walidacja `supplier.findFirst({id, orgScope})` w `inventory-items` POST/PATCH i `invoices` POST |
| S2 | Mutacja alertu gated uprawnieniem **odczytu** (`VIEW_ANALYTICS`, pakiet księgowej) | `alerts/[id]` PATCH → `MANAGE_ORG` |
| S3 | `CRON_SECRET` porównywany niestałoczasowo (`===`) na najbardziej uprzywilejowanej ścieżce (wszystkie org) | `crypto.timingSafeEqual` na równych długościach |
| S4 | Brak throttlingu logowania → brute-force / credential stuffing | Limit 10/15 min per e-mail w `authorize` (in-memory, best-effort) |
| S5 | Ręczne tworzenie sprzedaży dostępne dla dowolnego pracownika → zniekształcanie przychodu/decyzji AI | `sales` POST → `VIEW_FINANCE` |
| S6 | Placeholder/za krótki `NEXTAUTH_SECRET` mógł trafić na produkcję | Fail-fast przy starcie produkcyjnym (pomija fazę builda) |

## 3. Wydajność / skalowanie

| # | Problem | Naprawa |
|---|---------|---------|
| P1 | Brak indeksu na `SaleItem.saleId` (join w każdej analityce) | `@@index([saleId])` + `@@index([productId])` |
| P2 | Brak indeksów FK: `RecipeItem.recipeId`, `InvoiceItem.invoiceId`, `WasteReport[org,user,createdAt]`, `Notification[user,createdAt]`, `Message[recipient,sender,createdAt]` | Dodane (migracja `audit_indexes_fk`) |
| P3 | Nieograniczone listy `/api/waste`, `/api/messages` i eksport strat | `take` + okno 90 dni (waste), `take 200` + desc/reverse (messages), `take 10000` (eksport) |
| P4 | `confirmInvoice` / `runAlerts` zapisywały po jednym rekordzie w pętli | `createMany` |

## 4. UX / frontend

| # | Problem | Naprawa |
|---|---------|---------|
| U1 | Błędy zapytań/mutacji znikały po cichu (pusty ekran = „brak danych") | Globalny `QueryCache`/`MutationCache` `onError` → toast (`providers.tsx`); kluczowe mutacje rzucają na `!ok` |
| U2 | Zmiana uprawnień nie działała do ponownego logowania — bez komunikatu | Notka w modalu uprawnień (`owner/employees`) |
| U3 | Sztywne, fałszywe statystyki urlopowe („18 dni") | Realne saldo liczone z danych (kwota 26 dni, spójne z dashboardem) |
| U4 | Brak blokady podwójnego wysłania (urlop/zadanie/awaria/strata) | `disabled={... || mutation.isPending}` + stan „Wysyłanie…" |
| U5 | Modal bez `role/aria`, bez blokady scrolla tła, ikona zamknięcia bez etykiety | `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-label`, blokada `overflow` |
| U6 | `coverage.weekStart` bez zabezpieczenia gdy zapytanie padło | Guard `!coverage?.weekStart` |
| U7 | Ikoniczne przyciski bez nazwy (dzwonek, wyślij, usuń) | `aria-label` |

---

## Weryfikacja po naprawach

| Kontrola | Wynik |
|----------|-------|
| `npx tsc --noEmit` | ✅ |
| `npm run test` (vitest) | ✅ 26/26 (w tym nowe testy regresyjne matchera) |
| `npm run build` | ✅ |
| `npm run smoke` (API/RBAC) | ✅ 39/0 |
| `npm run test:e2e` (Playwright) | ✅ 3/3 |

---

## Ograniczenia pozostające WYŁĄCZNIE z braku usług zewnętrznych

Te pozycje nie są błędami kodu — wynikają z braku dostępu do zewnętrznych systemów,
poświadczeń lub infrastruktury i wymagają działań poza repozytorium:

1. **Realna integracja POS** — obecnie sprzedaż przez import/`MANUAL`; produkcyjny konektor
   wymaga API i poświadczeń dostawcy POS (Toast/Square/GoPOS itp.).
2. **Realny KSeF** — provider `mock`; produkcyjnie wymaga certyfikatu/tokena KSeF i środowiska MF.
3. **OCR na żywych fakturach** — wymaga `ANTHROPIC_API_KEY` (bez klucza tryb regułowy/ręczny).
4. **Rate limiter współdzielony (Redis)** — obecny in-memory jest poprawny dla pojedynczej
   instancji; skalowanie poziome i twarde limity kosztów LLM wymagają Redis/Upstash.
5. **Cron alertów dla wielu tenantów** — pętla sekwencyjna wystarcza dla pilota; przy setkach
   organizacji wymaga kolejki zadań / współbieżności (infrastruktura).
6. **Migracja Next 16** — 1 residual high w `npm audit` (wymaga majora); mitygowane RBAC na API.
7. **Agregacja sprzedaży w SQL** (zamiast w pamięci) dla `foodCostVariance`/snapshot — poprawne
   teraz; pełna optymalizacja przy bardzo dużym wolumenie POS to refaktor wydajnościowy, nie błąd.

Pełny kontekst i uzasadnienie: [`SUGGESTIONS.md`](../SUGGESTIONS.md), [`docs/RELEASE_v1.0.md`](RELEASE_v1.0.md).
