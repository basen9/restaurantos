# Re-audyt całości po wdrożeniu nowych funkcji (#4)

Po wdrożeniu planu sali, pełnych przepisów i PWA przeprowadzono niezależny re-audyt
(architektura, UX, wydajność, bezpieczeństwo, skalowalność, spójność modułów).
Poniżej znaleziska **naprawione** oraz **roadmapa** świadomie odroczonych usprawnień.

## Naprawione w tym przebiegu

| # | Waga | Problem | Naprawa |
|---|------|---------|---------|
| SW | **CRITICAL** | Service worker cache'ował payloady RSC/dokumenty (dane konkretnego użytkownika) → wyciek między użytkownikami na współdzielonym tablecie | `public/sw.js`: cache wyłącznie zasobów statycznych (allowlist `/_next/static`, destination script/style/font/image); dokumenty i RSC zawsze z sieci; bump `ros-v2` |
| B1 | **HIGH** | Sprzedaż z sali niewidoczna w analityce/AI COO/alertach, bo `PosConnection.connected` nigdy nie ustawiane | `closeOrder` ustawia `connected=true` (upsert) w transakcji — przychód z sali zasila dashboard, COO i alerty |
| B2 | **MEDIUM** | `locationId` sprzedaży brany od zamykającego użytkownika, nie od stolika → błędna analityka per-lokal | `closeOrder` bierze `locationId` ze strefy stolika (`table.zone.locationId`) |
| C1 | **MEDIUM** | Zamknięcie rachunku (tworzy przychód) dostępne dla każdego pracownika bez uprawnienia | Nowe uprawnienie `MANAGE_ORDERS` + pakiet `WAITER`; `close` wymaga `MANAGE_ORDERS` (spójnie z gatingiem ręcznej sprzedaży). Otwieranie/dopisywanie/status pozostają operacyjne |
| D2 | **MEDIUM** | Gorący lookup otwartego rachunku bez właściwego indeksu | `@@index([tableId, status])` na `TableOrder` |
| #4-prod | **MEDIUM** | `addItems` zapisywał `productId` bez walidacji właściciela | Walidacja przynależności `productId` do organizacji (inaczej null) |
| reorder | **MEDIUM** | Zmiana kolejności stref niespójna (kolizje sortOrder, wyścigi) | Atomowy endpoint `POST /api/zones/reorder` (sortOrder = pozycja, transakcja) |
| A1/A2/B4 | **LOW** | `orderService` nie używał `orgScope`; brak audytu dopisywania/statusu pozycji; zdublowane zaokrąglanie | Użycie `orgScope`, audyt `order.addItems`/`orderItem.status`, wspólne `round2` |
| AI | — | AI COO nie znał stanu sali | Nowe narzędzie `get_floor_status` (zajęte stoliki, wartość otwartych rachunków, pozycje wg statusu, stoliki czekające najdłużej) — AI COO „widzi" salę |

## Roadmapa — świadomie odroczone (z uzasadnieniem)

1. **Rozchód magazynu przy zamknięciu rachunku (food cost variance).** Zamknięcie tworzy sprzedaż,
   ale nie zdejmuje składników z magazynu. **Celowo nie dodane teraz** — rozchód realizuje moduł
   produkcji; podwójne zdejmowanie (produkcja + sprzedaż) zafałszowałoby stany. Docelowo: jeden,
   konfigurowalny tryb rozchodu (produkcja **albo** sprzedaż) — wymaga decyzji produktowej.
2. **Soft-delete stolików/stref** (zamiast kaskady) — zachowanie powiązania `Sale → rachunek` w historii
   (obecnie `Sale` przeżywa, ginie tylko link). Spójne z wzorcem `isActive` w innych modelach.
3. **KDS (ekran kuchni)** — osobny widok sterowany istniejącym `OrderItemStatus` (model gotowy, brak ekranu).
4. **Alert „wolna obsługa"** — pozycja `PREPARING > N min` (dane już liczone w `lib/floor.ts`).
5. **Link wariancja ↔ receptura** — przy wysokiej wariancji składnika pokazać dotknięte receptury + SOP porcjowania.
6. **Retencja/archiwizacja** zamkniętych rachunków + raporty sprzedaży wg stref/kelnerów.
7. **Biometria (WebAuthn passkeys)** — patrz `docs/PWA.md` (device-gated, osobny krok bezpieczeństwa).

## Weryfikacja po naprawach

| Kontrola | Wynik |
|----------|-------|
| `tsc --noEmit` | ✅ |
| `vitest` | ✅ 36/36 |
| `build` | ✅ |
| `smoke` | ✅ 50/0 |
| `e2e` | ✅ 3/3 |
| Przepływ sali | ✅ otwórz→dodaj→status→**zamknij (RBAC)**→sprzedaż→posConnected |
