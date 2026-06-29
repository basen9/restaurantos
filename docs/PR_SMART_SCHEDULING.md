# Raport — Inteligentna optymalizacja grafików

## Co dodano
- **Prognoza popytu** (`lib/scheduling.ts` `avgRevenueByDow`): średni przychód per dzień tygodnia z historii sprzedaży (ostatnie 4 tyg.).
- **Rekomendowana obsada** (`recommendedHeadcount`): z budżetu pracy = prognoza × cel kosztu pracy (25%) / średnia stawka / długość zmiany.
- **Generator grafiku** (`lib/scheduleService.ts` `generateWeek`): tworzy `Schedule` (DRAFT) + `Shift` na tydzień, przydzielając dostępnych pracowników (model `Availability`, fallback: wszyscy) z rotacją (sprawiedliwość). Idempotentny (nadpisuje DRAFT tygodnia).
- **Pokrycie** (`getCoverage`): zaplanowani vs rekomendowani per dzień + luka.
- **API**: `GET /api/schedule/forecast`, `POST /api/schedule/generate`, `GET /api/schedule/coverage`. RBAC: `schedule.manage`. Audyt generacji.
- **UI** `/owner/schedule`: KPI (cel kosztu pracy, śr. stawka, rekom./zaplanowane), pasek pokrycia per dzień, przycisk „Generuj grafik".

## Testy
- **Jednostkowe (vitest): 17/17 ✅** — dodano `tests/scheduling.test.ts` (`avgRevenueByDow`, `recommendedHeadcount`, `assignEmployees`, `coverageGap`).
- **Integracyjne (runtime):** prognoza (Pon 2848 zł → 2 os.), generacja (2 zmiany), pokrycie 2/2, idempotencja (2. generacja bez duplikatów), pracownik 403, `/owner/schedule` 200.
- `tsc` ✅, `next build` ✅.

## Uwagi
- Jakość prognozy rośnie z ilością danych POS (przy braku historii rekomendacje = 0 i komunikat o podłączeniu POS).
- Dostępność pracowników (`Availability`) jest uwzględniana, jeśli zdefiniowana; brak → wszyscy dostępni.

## Następne usprawnienia (SUGGESTIONS.md)
- Uwzględnienie kompetencji/stanowisk (barista/piekarz) w przydziale.
- Prognoza godzinowa (peak hours) zamiast dziennej; zmiany o różnej długości.
- Czynniki zewnętrzne (pogoda, święta, wydarzenia) w prognozie.
- Publikacja grafiku (DRAFT→PUBLISHED) + powiadomienia i akceptacje pracowników.
