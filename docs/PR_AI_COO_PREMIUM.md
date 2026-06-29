# Raport — AI COO Premium

## Co dodano
- **Architektura tool-use** (`lib/cooTools.ts`): 6 narzędzi, którymi AI COO sięga po realne dane na żądanie (zamiast wstrzykiwania całego snapshotu): `get_sales`, `get_labor_cost`, `get_inventory_status`, `get_food_cost_variance`, `get_waste`, `get_attention_items`. Każde org-scoped (izolacja tenanta).
- **Agentowa pętla** w `/api/coo` (Claude `claude-opus-4-8`): model wywołuje narzędzia → serwer je wykonuje → wynik wraca do modelu → odpowiedź. Z kluczem `ANTHROPIC_API_KEY`. Bez klucza lub przy błędzie providera — **degradacja do rekomendacji regułowych** na realnych danych (w pełni offline).
- **Trwałe przeglądy** (`CooReview`, migracja): `mode=review` zapisuje analizę; `GET /api/coo` zwraca historię; UI: modal „Historia" na `/owner/coo`.
- **Rate-limiting** per organizacja (`lib/ratelimit.ts`): 30 zapytań/h, kod 429 po przekroczeniu (ochrona kosztów AI).
- **RBAC**: dostęp tylko z uprawnieniem `analytics.view` (OWNER + nadane).

## Testy
- **Jednostkowe (vitest, `npm test`): 8/8 ✅** — `tests/finance.test.ts` (COGS), `tests/permissions.test.ts` (RBAC), `tests/ratelimit.test.ts` (limiter).
- **Integracyjne (runtime, curl):** przegląd zapisany i zwracany w historii; pracownik 403 (POST i GET); rate-limit zwraca 429 po 30 zapytaniach; strona `/owner/coo` 200.
- `tsc --noEmit` ✅, `next build` ✅.

## Uwagi
- Pętla tool-use wykonuje realne wywołania LLM tylko z kluczem `ANTHROPIC_API_KEY` (w środowisku bez klucza weryfikowana jest ścieżka regułowa + egzekucja narzędzi to te same, sprawdzone funkcje DB).
- Executory narzędzi korzystają z `lib/finance.ts` i zapytań Prisma identycznych jak w zweryfikowanych endpointach.

## Następne usprawnienia (w SUGGESTIONS.md)
- Streaming odpowiedzi (SSE) w czacie.
- Cykliczny auto-przegląd (cron) + powiadomienie właściciela.
- Budżet tokenów per organizacja (twardszy limit kosztów niż liczba zapytań).
