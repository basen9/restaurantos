# WorkOS — Rejestr pomysłów produktowych (living document)

> Pomysły zbierane na bieżąco z perspektywy **Senior PM / Senior UX / CTO** podczas rozwoju produktu.
> Każdy wpis: **problem → propozycja → uzasadnienie biznesowe → sposób wdrożenia → priorytet**.
> Cel nadrzędny: najlepszy **AI Operating System dla gastronomii**, nie kolejny system do restauracji.

Legenda priorytetów: 🔴 krytyczny · 🟠 wysoki · 🟡 średni · 🟢 opcjonalny.
Status: ✅ wdrożone · 🟦 zaplanowane · 💡 pomysł.

---

## A. Wdrożone w Etapie 0 (fundament)

- ✅ **RBAC oparty na uprawnieniach, nie na roli.** „Manager/Księgowa/Magazynier" jako *zestawy uprawnień* (`PERMISSION_BUNDLES`), nie sztywne role. Pozwala sprzedawać elastyczność enterprise bez mnożenia ról.
- ✅ **Multi-tenant od fundamentu** (`Organization`). Bez tego nie ma SaaS; retrofit później byłby dramatycznie droższy.
- ✅ **Audyt zdarzeń** (`AuditLog`). Wymóg zaufania enterprise i zgodności (kto zatwierdził urlop/koszt).
- ✅ **Trwały clock-in** ze źródłem prawdy w bazie. Podstawa pod ewidencję czasu pracy i koszt pracy.

---

## B. Najbliższe wysokowartościowe (Etap 1–2)

> Aktualizacja Etap 1–2: ✅ Skrzynka decyzji (B1) wdrożona jako silnik reguł na dashboardzie.
> ✅ Magazyn + receptury + food cost teoretyczny (B2 częściowo — została wariancja vs rzeczywisty).
> ✅ Tryb mobilny powłoki (B3). Następny krok: wariancja food cost + AI COO z tool-use.

### B1. 🟠 Skrzynka decyzji (Decision Inbox) zamiast pulpitu liczb
- **Problem:** konkurenci (Toast, Square, Lightspeed) pokazują *raporty*; właściciel i tak musi sam wyciągać wnioski.
- **Propozycja:** centralny widok rekomendacji z **akcją** i **wpływem finansowym** („Zmień dostawcę masła → −1 200 zł/mc [Zatwierdź]").
- **Uzasadnienie:** to przesuwa produkt z kategorii „BI" do „AI COO" — główny wyróżnik i argument cenowy.
- **Wdrożenie:** model `Decision { type, title, impactPLN, status, payload }`; generator reguł (Etap 3) zasila skrzynkę; UI = lista kart z akcją.
- **Status:** 🟦

> Aktualizacja: ✅ Inteligentny grafik (prognoza popytu → rekomendowana obsada → generator z dostępnością + pokrycie) wdrożony. Następne: kompetencje/stanowiska w przydziale, prognoza godzinowa (peak hours), czynniki zewnętrzne (pogoda/święta), publikacja DRAFT→PUBLISHED z powiadomieniami i akceptacją pracownika. Uzasadnienie: precyzyjniejsza obsada wprost obniża koszt pracy % i braki w godzinach szczytu.

### B2. 🟠 Theoretical vs Actual food cost (wariancja)
- **Problem:** straty i remanenty są dziś oderwane od receptur i sprzedaży — nie widać „znikających pieniędzy".
- **Propozycja:** food cost teoretyczny (receptury × ceny zakupu × sprzedaż POS) vs rzeczywisty (zużycie z magazynu) → **wariancja** = sygnał kradzieży/przeporcjowania.
- **Uzasadnienie:** to flagowa funkcja Crunchtime (enterprise), ale podana prościej i z AI — natychmiastowy, mierzalny ROI dla SMB.
- **Wdrożenie:** modele `Recipe`/`RecipeItem`, `InventoryItem`, `StockMovement`; produkcja i straty jako ruchy magazynowe.
- **Status:** 🟦 (zależne od magazynu + receptur)

### B3. 🟠 Tryb kiosk / mobilny dla pracownika
- **Problem:** powłoka nie jest responsywna (sztywny sidebar), a pracownicy pracują na telefonie/tablecie.
- **Propozycja:** mobile-first shell + tryb kiosk na zmianie (QR clock-in, checklisty, zgłoszenia jednym tapnięciem).
- **Uzasadnienie:** codzienne użycie = lepka adopcja i niższy churn; różnicuje od ciężkich systemów desktopowych (Oracle Micros).
- **Wdrożenie:** drawer mobilny w `AppShell`, breakpointy Tailwind, dedykowany layout `/kiosk`.
- **Status:** 🟦

> Aktualizacja: ✅ OCR faktur (Vision) + KSeF (mock, gotowy pod gov) + auto-aktualizacja cen zakupu wdrożone. Następne: realny provider KSeF (token/cert, JPK), auto-zatwierdzanie przy wysokiej pewności dopasowania, ręczne mapowanie nierozpoznanych pozycji, **historia cen zakupu + alert skoku ceny dostawcy** (uzasadnienie: wczesne wykrycie wzrostu kosztów chroni food cost i marżę).

### B4. 🟡 OCR faktur → magazyn → ceny → food cost
- **Problem:** ręczne wpisywanie cen zakupu jest barierą adopcji i źródłem błędów.
- **Propozycja:** zdjęcie/PDF faktury → ekstrakcja pozycji (LLM Vision) → aktualizacja cen i stanów.
- **Uzasadnienie:** zamyka pętlę zakupową; w PL połączone z **KSeF** daje moat regulacyjny.
- **Wdrożenie:** upload do storage, Claude Vision (tool-use), mapowanie pozycji na produkty, kolejka przetwarzania.
- **Status:** 💡 (Etap 4)

---

> Aktualizacja: ✅ Multi-lokal z pełną analityką (ranking rentowności, przychód/marża/koszt pracy/straty per lokal, CRUD lokali, rozkład sprzedaży) wdrożony. Następne: filtr lokalu na całym dashboardzie, trendy lok.-do-lok. (benchmark wewnętrzny), pracownik w wielu lokalach. Uzasadnienie: benchmark wewnętrzny ujawnia najlepsze praktyki najlepszego lokalu do replikacji w pozostałych.

## C. Wyróżniki kategoryjne (Etap 3–5) — dlaczego WorkOS wygrywa

| Wyróżnik | Konkurenci | Przewaga WorkOS |
|---|---|---|
| **Decision-first** | Toast/Square/Lightspeed = raporty | Decyzje z akcją i wpływem $ |
| **Język naturalny nad biznesem** (tool-use) | brak / sztywne raporty | „dlaczego marża spadła?" → liczby + rekomendacja |
| **Jedna pętla** sprzedaż→receptury→magazyn→zakupy→praca→P&L | rozbite moduły | spójny model + AI |
| **Moat PL/EU** (KSeF, JPK, ZUS/PPK, HACCP) | globalni wolno wchodzą | natywna zgodność |
| **Cyfrowy bliźniak** (symulacje co-jeśli) | brak w SMB | „+5% cen i zmiana dostawcy?" → prognoza P&L |
| **Benchmarki sieciowe** | brak | anonimowe porównania → efekt sieci |

---

## D. UX / UI (dług do spłaty)

- 🟡 **Tokeny designu** zamiast 3 systemów stylów (Tailwind + custom CSS + inline hex). Obniża koszt każdej nowej strony. **Wdrożenie:** przenieść paletę do `tailwind.config`, warianty komponentów.
- 🟡 **Dostępność (a11y):** brak `aria-*` i focus-ringów. **Wdrożenie:** audyt WCAG AA, focus-visible w `globals.css`.
- 🟢 **Onboarding właściciela:** kreator celów (food cost <30%, labor <28%) zasilający progi alertów.

---

## E. Architektura / CTO

- 🟠 **Warstwa zdarzeń + cron/kolejka** pod alerty i AI COO (przetwarzanie w tle). **Wdrożenie:** kolejka (np. pg-boss/Redis) + harmonogram.
- 🟡 **Metryki materializowane** zamiast agregacji na żywo (`/api/analytics`). **Wdrożenie:** widoki/tabela `MetricDaily`, odświeżanie cron.
- 🟡 **Rate-limiting i limity kosztów AI** per organizacja. **Wdrożenie:** licznik w Redis + budżet tokenów na tenant.
- ✅ **AI z tool-use** (Claude `claude-opus-4-8`) wdrożone w AI COO Premium (6 narzędzi, agentowa pętla, degradacja regułowa, rate-limit, trwałe przeglądy). Pozostało: **streaming (SSE)** w czacie, **cron auto-przegląd** + powiadomienie, **budżet tokenów per org** (twardszy limit kosztów). Uzasadnienie: streaming poprawia UX długich odpowiedzi; cron buduje nawyk i retencję; budżet tokenów chroni marżę przy skali.
- 🟢 **Testy** (unit dla domeny, e2e dla ścieżek krytycznych) — dziś brak.
