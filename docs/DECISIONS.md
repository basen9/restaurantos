# Przyjęte założenia projektowe (decyzje konfigurowalne)

Decyzje biznesowe podejmowane podczas autonomicznego rozwoju — zgodnie z najlepszymi
praktykami światowych POS, zawsze **konfigurowalne z panelu** (bez zmian w kodzie).

## Opłata serwisowa (service charge)
- Domyślnie **wyłączona**. Brak sztywnej wartości.
- Konfigurowalne: włączenie, typ (`PERCENT` / `AMOUNT`), wartość, stawka VAT opłaty.
- **Założenie rozliczeniowe:** opłata serwisowa jest **osobną pozycją przychodu** (nie miesza się
  z przychodem z pozycji menu — nie zniekształca food cost %). Naliczana od kwoty po rabacie.
  Jej VAT liczony wg konfigurowalnej stawki i raportowany osobno. Właściciel ustawia stawkę i sposób
  zgodnie z lokalnymi przepisami.

## Rabaty / comp / storno
- **Pełne storno (void) i comp** (rabat 100%) — tylko **manager/właściciel** (uprawnienie `discounts.manage`).
- **Kelner** może udzielać rabatów **tylko w ramach limitu %** ustawionego przez właściciela
  (`waiterDiscountLimitPct`, domyślnie 0 = bez rabatów). Przekroczenie limitu → odmowa (403).
- Wszystkie operacje (rabat, storno, comp, zamknięcie) są **audytowane** (`AuditLog`).
- Limit kelnera dotyczy **rabatu ręcznego**; wymiana punktów lojalnościowych jest niezależna
  (punkty są zarobione przez gościa, nie da się ich „nabić" — brak endpointu przyznawania punktów).
  **Uwaga przy rozbudowie:** ewentualny przyszły endpoint przyznawania punktów musi być
  ograniczony uprawnieniem managera, by nie obejść limitu rabatu kelnera.

## 2FA
- **Opcjonalne** dla każdego użytkownika (TOTP RFC 6238, bez usług zewnętrznych — wyłącznie `node:crypto`).
  Zgodne z Google Authenticator / Authy / 1Password (SHA-1, 6 cyfr, okno 30 s, tolerancja ±1 krok).
- Właściciel może **wymusić** 2FA dla wybranych ról z ustawień (`twoFactorRequiredRoles`).
  Użytkownik roli wymuszonej **nie może wyłączyć** 2FA (endpoint `disable` zwraca 403).
- **Enrollment** (`/security`): `POST /api/2fa/setup` generuje sekret „pending" (jeszcze nieaktywny)
  → użytkownik skanuje/wpisuje klucz w aplikacji → `POST /api/2fa/enable` potwierdza kodem i aktywuje 2FA.
- **Kody odzyskiwania:** 10 jednorazowych kodów generowanych przy aktywacji, przechowywanych jako
  skróty **bcrypt**, pokazywanych użytkownikowi tylko raz. Zużyty kod jest usuwany przy logowaniu.
- **Logowanie:** gdy użytkownik ma aktywne 2FA, `authorize` wymaga pola `token` (TOTP **lub** kod
  odzyskiwania). Brak kodu → `2FA_REQUIRED`, błędny kod → `2FA_INVALID` (ekran logowania pokazuje pole na kod).
- **Wyłączenie** (`POST /api/2fa/disable`): wymaga hasła **oraz** ważnego kodu TOTP/odzyskiwania.
- **Założenie (enforcement vs enrollment):** wymuszenie roli nie blokuje pierwszego logowania bez 2FA
  (użytkownik musi móc się zalogować, by włączyć 2FA na `/security`); wymuszenie egzekwujemy przez brak
  możliwości wyłączenia oraz wskaźnik na ekranie bezpieczeństwa. Twardy gate „zaloguj → najpierw skonfiguruj 2FA"
  pozostaje do dodania jako rozszerzenie (middleware), jeśli właściciel będzie tego wymagał.
- **Audyt:** `2fa.enable` / `2fa.disable` zapisywane w `AuditLog`.

## CRM / kampanie
- Pełny profil gościa: notatki, preferencje, alergeny, urodziny, historia wizyt, punkty, segmenty (tagi).
- Kampanie (e-mail/SMS/push) jako moduł z **abstrakcją dostawcy** — wysyłka mockowa, gotowa pod
  podłączenie zewnętrznych dostawców (decyzja/integracja właściciela).

## i18n
- Aplikacja przygotowana pod tłumaczenia (słownikowy system, język w ustawieniach), łatwe dodawanie języków.
