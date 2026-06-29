# Raport — Etap 1 (dashboard + moduły pracownika) i Etap 2 (pętla pieniędzy)

> Kontynuacja pracy na istniejącym kodzie WorkOS V2. Branch: `claude/workos-v2-audit-roadmap-rpifru`.

---

## 1. Co zostało wykonane

### 1.1 Dashboard właściciela = Centrum dowodzenia (najważniejszy ekran)
Przeprojektowany jako produkt klasy enterprise. Odpowiada na 5 pytań w 30 s:
- **Q1 Ile dziś zarabiam** — hero finansowy (sprzedaż/zysk/marża/food cost). Food cost liczony realnie z receptur; sprzedaż/zysk bramkowane integracją POS (bez zmyślania liczb).
- **Q2 Gdzie tracę** — straty dziś/7 dni/m-c + trend dzień-do-dnia + top produkty (wykres).
- **Q3 Który lokal najlepszy** — ranking lokali ze scoringiem (straty/awarie/obsada), gotowy na multi-lokal.
- **Q4 Co zamówić** — realne sugestie z magazynu (pozycje ≤ minimum) z ilością, dostawcą i szac. kosztem.
- **Q5 Co wymaga uwagi** — **Skrzynka decyzji** (silnik reguł): awarie, urlopy, wysokie straty, niski stan, wysoki food cost — każda z akcją i priorytetem. To zalążek AI COO.

### 1.2 Responsywna powłoka mobilna
`AppShell`: statyczny sidebar na desktopie, wysuwany drawer na mobile (hamburger w `TopBar`, zamykanie przy zmianie trasy). Stan zmiany w pasku zasilany realnym clock-in z bazy. Naprawiono brak responsywności (kluczowe dla pracowników na telefonie).

### 1.3 Dokończone moduły pracownika (7 stron „w budowie" → działające)
Mój grafik, Czas pracy (godziny tydzień/m-c), Checklisty (run + postęp), Produkcja (wsad), Remanent (różnice), Wiadomości (wątki), Moje wyniki (skuteczność).

### 1.4 Pętla pieniędzy: magazyn + dostawcy + receptury + food cost
- Modele: `Supplier`, `InventoryItem`, `StockMovement`, `Recipe`, `RecipeItem`, `Product.price`, enum `MovementType`.
- API z RBAC/Zod/tenant: dostawcy, pozycje magazynowe (z przyjęciami jako ruchy magazynowe), receptury (z wyliczonym food cost % i marżą).
- UI właściciela: `/owner/warehouse` (stany, „do zamówienia", przyjęcia, dostawcy) i `/owner/recipes` (food cost i marża per wyrób, kreator receptury).
- Food cost teoretyczny i sugestie zamówień wpięte w dashboard.

### 1.5 Naprawione przy okazji (myślenie jak CTO/UX)
- **Podwójna powłoka** pod `/owner/*` (AppShell w layoutach dzieci + w layoucie rodzica) — usunięto nadmiarowe layouty.
- `parseBody` zwraca typ wyjściowy Zod (z `.default()`), co usunęło błędy typów i ryzyko `undefined`.
- Wszystkie endpointy `force-dynamic` (czysty build).

---

## 2. Co ulepszono względem poprzedniej wersji
- Panel „managera" (4 kafle) → **centrum dowodzenia** odpowiadające na pytania biznesowe, nie pokazujące surowych liczb.
- Aplikacja działa na telefonie (wcześniej sztywny sidebar).
- ~60% placeholderów → działające moduły (pracownik) + 2 nowe moduły właściciela.
- Straty/produkcja/remanent przestają być oderwane — magazyn i receptury domykają ekonomikę (food cost, wariancja w kolejnym kroku).

## 3. Nowe pomysły (szczegóły w `SUGGESTIONS.md`)
- **Wariancja food cost** (teoretyczny vs rzeczywisty z ruchów magazynowych) — detektor kradzieży/przeporcjowania (następny naturalny krok po tym etapie).
- **Auto-zamówienia do dostawcy** (e-mail/EDI) z koszyka „do zamówienia".
- **AI COO z tool-use** nad bazą + streaming (Skrzynka decyzji już przygotowana strukturalnie).

## 4. Następny etap (proponowany)
1. **Wariancja food cost** + automatyczne zużycie składników z produkcji/sprzedaży (StockMovement USAGE).
2. **AI COO** właściwy: LLM z tool-use nad metrykami + cotygodniowy AI-przegląd.
3. **POS (integracja)** — odblokowuje sprzedaż/zysk/marżę i pełny ranking rentowności lokali.
4. Panele właściciela na realnych danych: pracownicy, urlopy (akcje), zadania, straty (obecnie część to widoki listowe).
5. **OCR faktur → magazyn** (KSeF) — moat PL/EU.

## 5. Uwagi środowiskowe
- PostgreSQL bywa zatrzymywany między sesjami — uruchomić: `service postgresql start`.
- Silniki Prisma pobrane lokalnie (proxy) — runtime używa klienta z `.prisma/client`.
- Konta: `owner@workos.pl/owner123`, `lead@workos.pl/lead123` (EMPLOYEE z uprawnieniami), `anna@workos.pl/anna123`.
