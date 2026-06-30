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

## 2FA
- **Opcjonalne** dla każdego użytkownika (TOTP, bez usług zewnętrznych).
- Właściciel może **wymusić** 2FA dla wybranych ról z ustawień (`twoFactorRequiredRoles`).

## CRM / kampanie
- Pełny profil gościa: notatki, preferencje, alergeny, urodziny, historia wizyt, punkty, segmenty (tagi).
- Kampanie (e-mail/SMS/push) jako moduł z **abstrakcją dostawcy** — wysyłka mockowa, gotowa pod
  podłączenie zewnętrznych dostawców (decyzja/integracja właściciela).

## i18n
- Aplikacja przygotowana pod tłumaczenia (słownikowy system, język w ustawieniach), łatwe dodawanie języków.
