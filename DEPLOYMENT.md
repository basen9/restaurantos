# Wdrożenie produkcyjne — WorkOS

## Wymagania
- Node 20+, PostgreSQL 14+.
- Zmienne środowiskowe (`.env`):
  - `DATABASE_URL` — PostgreSQL.
  - `NEXTAUTH_SECRET` — **silny, losowy** (min. 32 znaki, `openssl rand -base64 32`).
  - `NEXTAUTH_URL` — publiczny URL aplikacji.
  - `ANTHROPIC_API_KEY` — dla AI COO i OCR faktur (bez klucza: tryb regułowy / ręczny).

## Pierwsze uruchomienie
```bash
npm ci
npx prisma migrate deploy      # migracje (nie 'dev') na produkcji
node prisma/seed.js            # opcjonalnie: dane demo
npm run build
npm run start
```

## Migracje
- Produkcyjnie: `npm run db:deploy` (= `prisma migrate deploy`). Migracje wersjonowane w `prisma/migrations/`.
- Każda zmiana schematu: `npm run db:migrate` lokalnie → commit migracji → `db:deploy` na prod.

## Backup / Recovery
```bash
DATABASE_URL=... ./scripts/backup.sh ./backups   # pg_dump (retencja 14)
DATABASE_URL=... ./scripts/restore.sh backups/workos_YYYYMMDD_HHMMSS.dump
```
Zalecenie: cron codzienny `backup.sh` + replikacja off-site.

## Monitoring i logi
- **Health-check:** `GET /api/health` (zwraca `{status, db}`; 503 gdy baza niedostępna) — podłącz pod uptime monitor / k8s liveness.
- **Logi:** structured JSON (`lib/logger.ts`) na stdout — kierować do agregatora (Datadog/Logtail/CloudWatch).
- **Błędy:** `handle()` loguje nieobsłużone wyjątki; do podłączenia Sentry (DSN przez env) w jednym miejscu.
- **Audyt:** tabela `AuditLog` rejestruje operacje wrażliwe (approvale, faktury, POS/KSeF, grafik, lokale, sprzedaż).

## Bezpieczeństwo
- Nagłówki (HSTS, X-Frame-Options, nosniff, Referrer-Policy) w `next.config.js`.
- RBAC oparty na uprawnieniach + izolacja tenanta (`organizationId`) w każdym zapytaniu.
- Rate-limiting kosztownych endpointów (AI/OCR/POS/KSeF/grafik). **Uwaga:** limiter w pamięci — przy skalowaniu poziomym przenieść do Redis (`lib/ratelimit.ts`).

## Testy / CI (rekomendacja pipeline)
```bash
npm run test         # jednostkowe (vitest)
npm run build        # typecheck + build
npm run start &      # serwer
npm run smoke        # integracyjne (API/RBAC) — wymaga zseedowanej bazy
npm run test:e2e     # E2E (Playwright)
```

## Znane ograniczenia środowiskowe
- Silniki Prisma mogą wymagać ręcznego pobrania w sieci za restrykcyjnym proxy (patrz README/skrypty); na standardowym hostingu `npm ci` pobiera je automatycznie.
- Integracje POS i KSeF działają w trybie demo (provider `mock`) — do podłączenia realnych API przed produkcją z prawdziwą sprzedażą/fakturami.
