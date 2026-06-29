# Raport — Multi-lokal z pełną analityką

## Co dodano
- **Zarządzanie lokalami** — `GET/POST /api/locations` + `PATCH /api/locations/[id]` (RBAC: odczyt dla zalogowanych, zapis `org.manage`).
- **Pełna analityka per-lokal** — `lib/locationAnalytics.ts` `getLocationsBreakdown`: dla każdego lokalu przychód dziś/7 dni, marża surowca, koszt pracy (zmiany w lokalu × stawki), straty (m-c), otwarte awarie, obsada, aktywni na zmianie.
- **Ranking rentowności** — `rankLocations` (pure): marża − straty/20 − awarie×5 (brak marży = neutralnie). Zastępuje prosty ranking po stratach.
- **Rozkład sprzedaży na lokale** — mock POS przypisuje każdą transakcję do losowego aktywnego lokalu (realny przychód per lokal).
- **UI** `/owner/locations`: ranking z metrykami (sprzedaż/marża/koszt pracy/straty/obsada) + dodawanie lokalu; dashboard pokazuje przychód i marżę per lokal. Nawigacja: „Lokale".
- **Seed**: drugi lokal (Kraków Kazimierz) z przypisanym pracownikiem.

## Testy
- **Jednostkowe (vitest): 19/19 ✅** — dodano `tests/locationAnalytics.test.ts` (`rankLocations`).
- **Integracyjne (runtime):** 2 lokale; POS rozłożył sprzedaż (Kazimierz 3108 zł #1, Rynek 2181 zł); per-lokal marża/koszt pracy/straty; owner POST 201; pracownik POST 403 / GET 200; `/owner/locations` 200.
- `tsc` ✅, `next build` ✅.

## Uwagi
- Straty/awarie przypisywane do lokalu przez `user.locationId` autora; sprzedaż/zmiany mają własny `locationId`.
- Wielofirmowość (multi-tenant) była już od Etapu 0 (`Organization`); ten moduł dodaje pełną **wielolokalowość** w obrębie firmy.

## Następne usprawnienia (SUGGESTIONS.md)
- Filtr lokalu na całym dashboardzie (hero finansowy per lok.).
- Porównania lok.-do-lok. w czasie (trendy) i benchmark wewnętrzny.
- Przypisywanie pracowników do wielu lokali; transfery między lokalami.
