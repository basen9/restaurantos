# Raport — OCR faktur + KSeF + automatyczna aktualizacja cen zakupu

## Co dodano
- **Modele** (migracja `invoices_ocr_ksef`): `Invoice`, `InvoiceItem` (z dopasowaniem do `InventoryItem`), `KsefConnection`, enumy `InvoiceSource`/`InvoiceStatus`.
- **OCR (Claude Vision)** — `lib/ocr.ts` + `POST /api/invoices/ocr`: zdjęcie faktury → ustrukturyzowane pozycje (JSON), automatyczne dopasowanie do magazynu. Wymaga `ANTHROPIC_API_KEY` (bez klucza: dodawanie ręczne / KSeF).
- **KSeF** — `lib/ksef.ts` (abstrakcja providera, mock generujący przykładowe faktury; gotowe pod realne API gov) + `GET/POST /api/ksef` z idempotencją po `externalId`.
- **Auto-dopasowanie** — `lib/invoices.ts` (`normalizeName`, `matchInvoiceLines`): normalizacja nazw (diakrytyki, „ł", znaki) i dopasowanie pozycji faktury do magazynu.
- **Zatwierdzanie z aktualizacją cen** — `lib/invoiceService.ts` + `POST /api/invoices/[id]/confirm`: ustawia ostatnią cenę zakupu (`costPerUnit`), przyjmuje na stan (`StockMovement PURCHASE`), zmienia status, audyt. Idempotentne.
- **UI** `/owner/invoices`: skan (OCR), sync KSeF, dodawanie ręczne, lista z dopasowaniami i przyciskiem zatwierdzenia. Nawigacja rozszerzona.
- **RBAC**: wszystko pod `inventory.manage`.

## Testy
- **Jednostkowe (vitest): 12/12 ✅** — dodano `tests/invoices.test.ts` (`normalizeName`, `matchInvoiceLines`, `parseInvoiceJson`).
- **Integracyjne (runtime, curl):** KSeF sync importuje fakturę; pozycje auto-dopasowane; zatwierdzenie zmienia cenę (Mąka 3→3,4 zł; Masło 32→34,5 zł) i stan (+25 / +10 kg); ponowny sync nie duplikuje (1 faktura); pracownik 403; `/owner/invoices` 200.
- `tsc` ✅, `next build` ✅.

## Uwagi
- OCR wykonuje realne wywołania Vision tylko z kluczem; logika parsowania/dopasowania jest testowana jednostkowo, a pipeline (tworzenie→dopasowanie→zatwierdzenie) zweryfikowany przez KSeF/ręczne.
- Realna integracja KSeF wymaga certyfikatu/tokenu i środowiska gov (test/prod) — provider jest gotowy do podmiany.

## Następne usprawnienia (SUGGESTIONS.md)
- Realny provider KSeF (auth tokenem, pobieranie/wysyłka FA), eksport JPK.
- Auto-zatwierdzanie faktur z wysoką pewnością dopasowania; ręczne mapowanie nierozpoznanych pozycji do magazynu.
- Historia cen zakupu (trend) + alert przy skoku ceny dostawcy.
