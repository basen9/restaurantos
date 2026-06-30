# RestaurantOS jako produkt komercyjny — przegląd konkurencyjny

Porównanie z Toast / Square for Restaurants / Lightspeed i dobór funkcji, które realnie
zwiększają wartość dla właścicieli i pracowników. Wdrażane kolejno jako osobne PR-y.

## Co już mamy (przewaga / parytet)
- **Plan sali + zamówienia przy stoliku na żywo** (statusy pozycji, czas oczekiwania) — parytet z table-service POS.
- **AI COO** (agentowy doradca z dostępem do sprzedaży/kosztu pracy/magazynu/wariancji, świadomy sali) — **przewaga** (konkurenci mają raporty, nie doradcę-agenta).
- **Food cost + wariancja** (teoretyczny vs rzeczywisty rozchód) — parytet/przewaga vs większość.
- **OCR faktur + KSeF**, magazyn, receptury — parytet, lokalna przewaga (KSeF/PL).
- **Inteligentny grafik**, multi-location, **PWA**, RBAC, audyt — parytet.

## Luki vs Toast/Square/Lightspeed (uszeregowane wg wartości × wykonalności)

| # | Funkcja | Dlaczego ważna | Status |
|---|---------|----------------|--------|
| A | **Zarządzanie menu + „86" (dostępność) + modyfikatory** | Rdzeń każdego POS; bez tego kelner nie ma pełnej karty, kuchnia nie zna „bez cebuli", brak szybkiego wyłączania pozycji | ✅ wdrożone |
| B | **KDS — ekran kuchni** | Standard Toast/Square; kuchnia widzi kolejkę i „bumpuje" pozycje zamiast kartek | ✅ wdrożone |
| C | **Operacje na rachunku: rabat, napiwek, metoda płatności, podział** | Rdzeń rozliczenia; zasila marżę (rabat), koszt pracy (napiwek), raporty (metoda) | ✅ wdrożone |
| D | **Raporty komercyjne: bestsellery, sprzedaż wg godzin/dnia, rotacja stolików** | Właściciel podejmuje decyzje (menu engineering, obsada) | ✅ wdrożone |
| E | **Publiczne menu QR (skan przy stoliku, bez logowania)** | Nowoczesny, bezkontaktowy kanał; goście widzą aktualną kartę | ✅ wdrożone (odczyt; samodzielne zamawianie gościa = kolejna transza) |
| F | Rezerwacje / lista oczekujących | Zarządzanie ruchem | roadmapa |
| G | CRM gości + lojalność (punkty, historia) | Powracalność, marketing | roadmapa |
| H | Realne płatności (terminal/online) | Wymaga integracji zewnętrznej (Stripe/Adyen) | zewnętrzne |

## Warstwa księgowo-finansowa (najsłabsza vs MICROS/Toast — uzupełniona)
| # | Funkcja | Dlaczego ważna | Status |
|---|---------|----------------|--------|
| K1 | **VAT na pozycjach + rozbicie podatku** | Bez VAT brak realnego rozliczenia fiskalnego | ✅ wdrożone |
| K2 | **Rozliczenie zmiany kasowej (cash drawer / Z-raport)** | Kontrola gotówki, wykrywanie niedoborów | ✅ wdrożone |
| K3 | **Raport i eksport płac (godziny × stawka)** | Księgowość: przygotowanie wynagrodzeń z odbitych zmian | ✅ wdrożone |

## Kolejna transza (po stronie produktu / decyzji biznesowych)
- **Void/storno pozycji z powodem** (loss prevention) — kontrola anulowań przed płatnością.
- **Przenoszenie/łączenie rachunków między stolikami** — elastyczność obsługi.
- **Atrybucja sprzedaży/napiwków do kelnera** — wymaga przypisania kelnera do rachunku (podstawa pod tip-pooling i ranking kelnerów); decyzja o modelu napiwków.
- **Rezerwacje / lista oczekujących**, **CRM + lojalność** — nowe domeny.
- **Realne płatności / fiskalizacja drukarki** — integracje zewnętrzne (Stripe/Adyen, drukarka fiskalna).

## Kolejność wdrożenia (zrealizowana)
A (menu) → B (KDS) → C (rozliczenie) → D (raporty) → E (QR-menu) → K1 (VAT) → K2 (kasa) → K3 (płace).
Każdy etap: implementacja → audyt → naprawa → testy (tsc/vitest/build/smoke/E2E) → PR → merge.
