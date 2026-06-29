# Raport — Hardening Pass (production-ready)

## Wykonane zmiany (wg priorytetów)

**1. Zależności / podatności**
- Next.js → 14.2.33; `overrides` dla `postcss` (^8.4.49) i `uuid` (^11.1.1) — usunięto podatności postcss/uuid/next-auth.
- Audyt produkcyjny: z **2 krytycznych + kilku** → **1 high** (`next`, fix tylko w major 16 — residual, patrz niżej). Krytyczne wcześniej dotyczyły dev-only `esbuild` (nie trafia na produkcję).

**2. Placeholdery / martwe linki**
- Dokończono 5 stron właściciela: `/owner/{employees, tasks, vacations, waste, incidents}` (funkcjonalne, na istniejących API + nowy `PATCH /api/incidents/[id]`).
- Usunięto `/swaps` (wymaga osobnego API — defer) z nawigacji i plików.
- **Zero placeholderów „w budowie", zero martwych linków** (zweryfikowane skanem + smoke 35/35).
- Naprawiono UX: logowanie routuje po roli (OWNER → `/owner`, EMPLOYEE → `/dashboard`).

**3. Rate limiting**
- `enforceRateLimit` zastosowany na wszystkich kosztownych endpointach: `ai`, `coo`, `invoices/ocr`, `pos`, `ksef`, `schedule/generate`.

**4. Wydajność / martwy kod / indeksy**
- Usunięto martwy kod i zbędne zapytania w `/api/analytics`.
- Naprawiono **N+1** w `locationAnalytics` (jedno zapytanie o zmiany zamiast per-lokal).
- Dodano indeks `Sale(@@index([organizationId, locationId, soldAt]))` (migracja `sale_location_index`).

**5. Auditing**
- Dodano `audit()` do: tworzenia faktur (serwis — pokrywa manual/OCR/KSeF), sprzedaży, tworzenia/edycji lokali, zmian statusu awarii. Pełniejszy ślad operacji.

**6. Testy**
- Jednostkowe (vitest): **19/19**.
- Integracyjne: `scripts/smoke.sh` (`npm run smoke`) — **35/35** (login, RBAC, izolacja, wszystkie strony).
- E2E (Playwright): `e2e/auth.spec.ts` (`npm run test:e2e`) — **3/3** (health, login OWNER→/owner, EMPLOYEE→redirect).

**7. Monitoring / logging / backup**
- `lib/logger.ts` (structured JSON) + użycie w `handle()`.
- `GET /api/health` (status + DB) pod uptime/k8s.
- `scripts/backup.sh` / `restore.sh` (pg_dump, retencja 14) + `DEPLOYMENT.md`.

**8. Bezpieczeństwo (OWASP / RBAC / multi-tenant / IDOR)**
- Nagłówki bezpieczeństwa w `next.config.js` (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; `poweredByHeader: false`).
- Skan: **wszystkie endpointy autoryzowane** (poza celowo publicznym `/api/health`); izolacja tenanta potwierdzona; brak wykrytego IDOR.

**9. Weryfikacja końcowa:** `tsc` ✅ · `next build` ✅ · vitest 19/19 ✅ · smoke 35/35 ✅ · E2E 3/3 ✅.

## Pozostałe problemy (świadome, udokumentowane)
1. 🟠 **1 high w `next`** — fix tylko w Next 16 (major). Mitygacja: RBAC egzekwowane na poziomie API (nie tylko middleware) — defense-in-depth. Rekomendacja: zaplanowana, przetestowana migracja Next 15/16 jako osobne zadanie.
2. 🟡 **Limiter w pamięci** — skuteczny dla 1 instancji; przy skalowaniu poziomym → Redis.
3. 🟡 **POS/KSeF w trybie mock** — przed obsługą realnej sprzedaży/faktur podłączyć realne API.
4. 🟡 **CI niewpięte** — skrypty gotowe (`test`/`build`/`smoke`/`test:e2e`); do dodania pipeline.
5. 🟡 **a11y** — częściowe (brak pełnych `aria-*`/focus-ring).

## Ocena gotowości produkcyjnej

| Kategoria | Przed | Po |
|---|---:|---:|
| Architektura | 7 | 8 |
| Bezpieczeństwo | 6 | 8 |
| UX | 6 | 8 |
| Wydajność | 5 | 7 |
| Skalowalność | 6 | 7 |
| AI | 7 | 7 |
| **Gotowość komercyjna** | 4 | **7,5** |

## Rekomendacja
Projekt jest **gotowy do scalenia całego stosu PR (#1→#5)** i do wdrożenia w trybie **early-access / pierwsi klienci kontrolowani**. Przed pełną skalą: (a) migracja Next 16, (b) Redis dla limitera, (c) realne integracje POS/KSeF, (d) pipeline CI.
