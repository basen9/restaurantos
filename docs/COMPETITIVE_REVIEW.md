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
| E | QR-menu / zamawianie bezkontaktowe gościa | Nowoczesny kanał, mniej pracy kelnera | roadmapa |
| F | Rezerwacje / lista oczekujących | Zarządzanie ruchem | roadmapa |
| G | CRM gości + lojalność (punkty, historia) | Powracalność, marketing | roadmapa |
| H | Realne płatności (terminal/online) | Wymaga integracji zewnętrznej (Stripe/Adyen) | zewnętrzne |

## Kolejność wdrożenia
A (menu — fundament) → B (KDS — konsumuje menu/zamówienia) → C (rozliczenie — domyka cykl) → D (raporty — czytają sprzedaż). E–G jako kolejna transza; H zależne od dostawcy płatności.
