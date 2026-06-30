# RestaurantOS POS — Projekt UX i funkcjonalności

> Status: **PROPOZYCJA DO AKCEPTACJI**. Zgodnie z decyzją: dopracowujemy każdy ekran, przepływ i detal
> **przed** implementacją. Dopiero po akceptacji rusza kod modułu POS.
> POS to **całkowicie oddzielny moduł** od paneli Owner/Manager/Employee — własny shell, własny język
> wizualny, własny rytm pracy. Cel: wyglądać i działać jak najlepszy POS na rynku, ale **szybciej i
> bardziej intuicyjnie**.

---

## 0. Filozofia i cele mierzalne

POS oceniamy sekundami i dotknięciami, nie listą funkcji. Twarde cele (budżety):

| Metryka | Cel | Dla porównania (rynek) |
|---|---|---|
| Logowanie operatora (PIN) | **< 1 s** | Toast/Square: 2–4 s |
| Start aplikacji (cold) do planu sali | **< 2 s** | często 5–10 s |
| Otwarcie stolika → pierwszy ekran zamówienia | **≤ 2 dotknięcia** | 3–5 |
| Dodanie pozycji z modyfikatorem | **≤ 3 dotknięcia** | 4–7 |
| Wysłanie zamówienia do kuchni | **≤ 1 dotknięcie** z koszyka | 2–3 |
| Podział rachunku po pozycjach | **≤ 4 dotknięcia** | 6–12 lub brak |
| Reakcja UI na dotyk | **< 100 ms** (optymistycznie) | zmienna, częste „lagi" |
| Praca bez sieci | **pełna** (zamówienia, druk kolejkowany) | częściowa/brak |

Zasada nadrzędna: **kelner nie myśli o aplikacji — myśli o gościu.** Interfejs ma znikać.

---

## 1. Analiza konkurencji → wnioski

> Uwaga: **„Gooods"** nie udało się zweryfikować jako istniejący system POS (sprawdzono wiele pisowni
> i domen). Najpewniej literówka — fonetycznie najbliżej **GoPOS**; realnymi polskimi alternatywami są
> **ABS POS**, **POSbistro**, **nomee**. Jeśli chodziło o konkretny produkt — podaj URL, dopiszę analizę.
> Liczby producentów (np. GoPOS „42% szybciej") to deklaracje marketingowe, nie dane niezależne.

### Co każdy robi dobrze (i co warto „ukraść i poprawić")
| System | Najmocniejszy element | Wada, którą eliminujemy |
|---|---|---|
| **GoPOS** (lider PL) | **GoHub** — zamówienia z Glovo/Wolt/Uber/Pyszne/Bolt na **jednym ekranie**; wirtualna kasa fiskalna; KSeF; SoftPOS w All-in-One; mapa sali + rezerwacje; „3 kliknięcia" do nabicia | Zależność od sieci mimo offline; mieszane wsparcie; koszty rosną z modułami (KDS, GoHub, lojalność jako płatne dodatki) |
| **Toast** | **Open View** — pozycja + WSZYSTKIE modyfikatory na jednym ekranie, w dowolnej kolejności; handheld Toast Go; logowanie kartą; coursing we wszystkich planach; Quick Edit (86/cena z POS) | Lock-in sprzętu + obowiązkowe płatności + umowy 2–3 lata; ukryte opłaty (KDS/online/marketing); słaby offline; awarie |
| **Square** | **Drag-and-drop coursing** z **one-tap fire/hold**; zagnieżdżone modyfikatory; miejsca (seats); lekki handheld; najprostszy onboarding, brak lock-in | Plan sali „dławi się" przy 40–50 miejscach; coursing max 10 i druk „od tyłu"; błędny routing do stacji; coursing dopiero w płatnym Plus; pooled tips „koszmar" |
| **Lightspeed** | **Tableside** — pełny ePOS + terminal w kieszeni; podział per miejsce także na handheldzie | Modyfikatory/notatki „niezdarne" (zmieniane nazwy pozycji); brak ułamkowych podziałów; QR przypięty do stolika nie rachunku; stroma krzywa; ukryte opłaty; wrażliwość na sieć |
| **Revel** | **„Always On"** — realny offline z **płatnościami kartą bez sieci** | Offline bywa zawodny; napiwki przypisywane do osoby zamykającej rachunek, nie do kelnera; zużycie iPadów; agresywny pricing |
| **Clover** | Otwarty **marketplace** modułów | Słaby coursing; podstawowy KDS (realny wymaga płatnej appki z marketplace); rozproszone wsparcie (3 podmioty) |
| **Syrve/iiko** | **Order injection** — zamówienia z dostaw/QR/kiosków wstrzykiwane wprost w pipeline POS↔kuchnia, bez przepisywania | Złożony, pod duże sieci; ciężki onboarding dla małego lokalu |
| **Dotykačka** | Tania, modularna, szybkie wdrożenie; integracje dostaw PL (przez Restimo) | Mobilny kelner za progiem taryfy; QR tylko przez partnerów; KDS osobno licencjonowany; lock-in sprzętu |
| **SumUp** | **QR przy stole bez aplikacji**, z auto-rozpoznaniem stolika | Słaby UX podziału rachunku; mniej godzin wsparcia w droższym planie; po rebrandingu fala skarg |

### Wspólne wady rynku (nasza lista „czego NIE robić")
1. **Fałszywy/słaby offline** — reklamowany, w praktyce zawodny (Toast, Lightspeed sporne, Revel sporne).
2. **Coursing kruchy** — psuje się, drukuje „od tyłu", limity (Clover, Square).
3. **Napiwki do złej osoby** — przypisywane zamykającemu, nie kelnerowi; pooled tips bez przejrzystości.
4. **KDS i kluczowe funkcje jako płatne dodatki** — coursing/KDS/online za dopłatą.
5. **Lock-in**: sprzęt + obowiązkowe płatności + umowy 2–3 lata + kary; ukryte, rosnące koszty.
6. **Modyfikatory na siłę** — wolny tekst / „zmieniane nazwy pozycji" zamiast struktury.
7. **Brak dodawania produktu „w locie"** i konieczność wejścia do backendu.
8. **Plan sali nie skaluje się** (dławienie przy ~40–50 miejscach).
9. **Stromy onboarding** (Toast/Lightspeed: tygodnie wdrożenia, samodzielna konfiguracja).
10. **Rozproszone, wolne wsparcie**.

### Najlepsze wzorce do przejęcia (i ulepszenia) — synteza
- **Open View modyfikatorów** (Toast) → nasz bottom-sheet: wszystko na jednym ekranie, dowolna kolejność, dopłaty na żywo, dyktowanie.
- **Drag-and-drop coursing + one-tap fire/hold** (Square) → nasze kursy + niezawodny routing stacji (eliminujemy „druk od tyłu").
- **Tableside w kieszeni** (Lightspeed) → responsywny POS = handheld z pełną płatnością i podziałem per miejsce.
- **Always On offline z płatnościami** (Revel) → nasz offline-first jako fundament, nie dodatek (Etap 2).
- **Order injection + agregator dostaw** (Syrve + GoHub) → wspólny **inbox „Kanały"**: dostawy/QR/kiosk wpadają wprost na rachunki/kuchnię.
- **QR bez aplikacji z auto-stolikiem** (SumUp) → nasz QR „zamów&zapłać" przypięty do **rachunku** (nie stolika — naprawiamy błąd Lightspeed).
- **Napiwki do właściwego operatora** (naprawa wady Revel/Square) → każda akcja z PIN operatora, przejrzysty podział puli (mamy modele).
- **Wirtualna kasa fiskalna + KSeF + integracje dostaw** (GoPOS) → wymóg rynku PL; u nas za abstrakcjami sprzętu/integracji.
- **Szybkie wdrożenie i brak lock-in** (Square) → onboarding w minutach, sprzęt-agnostyczny PWA, przejrzysty cennik.

---

## 2. Dziesięć zasad projektowych POS (nasz „North Star")

1. **Jedna ręka, kciuk, pośpiech.** Wszystkie częste akcje w dolnej, zasięgowej strefie ekranu.
2. **Wielkie cele dotykowe** (min. 48×48 px, realnie 64+), duże odstępy — obsługa mokrymi/zajętymi rękami.
3. **Optymistyczny UI.** Dotyk = natychmiastowa reakcja; synchronizacja w tle. Zero „spinnerów" w gorącej ścieżce.
4. **Offline-first.** Brak sieci nie zatrzymuje obsługi. Kolejka mutacji, idempotencja, auto-sync.
5. **Kolor = znaczenie.** Stany stolików/pozycji czytelne w 0,5 s, także przy słabym świetle.
6. **Mało ekranów, dużo kontekstu.** Sala → stolik → zamówienie to jedno płótno, bez przeładowań.
7. **Progresywne ujawnianie.** Proste rzeczy proste; zaawansowane (coursing, podziały) o jeden gest dalej.
8. **Nieodwracalne = potwierdzane; odwracalne = natychmiastowe.** Storno pyta; dodanie pozycji nie.
9. **Każda akcja ma autora.** Operator z PIN, pełny audyt (mamy `AuditLog`).
10. **Zero martwych stanów.** Każdy ekran pokazuje co dalej; błędy mówią ludzkim językiem i proponują akcję.

---

## 3. Architektura modułu POS

- **Oddzielny shell** (`(pos)` route-group) — własny layout, brak Sidebara/TopBara panelu. Pełny ekran,
  ciemny, wysokokontrastowy motyw zaprojektowany pod tablet w sali.
- **Tożsamość:** logowanie PIN-em na zaufanym terminalu (gotowe — Tożsamość 2.0). Terminal współdzielony
  = szybkie przełączanie operatora.
- **Offline-first (Etap 2):** lokalna kolejka mutacji (IndexedDB), idempotencyjne ID operacji,
  rozwiązywanie konfliktów „last-writer + reguły domeny", druk kolejkowany.
- **Realtime (Etap 2):** strumień zdarzeń (`item.fired`, `item.ready`, `table.updated`, `86.changed`)
  spina POS ↔ Kitchen ↔ plan sali w czasie rzeczywistym.
- **Mapowanie na istniejący backend:** `Zone`/`RestaurantTable` (plan sali), `TableOrder`/`TableOrderItem`
  (rachunek/pozycje, statusy, storno, gość), `Product` (menu, 86 = `available`, VAT), `CashSession`
  (zmiana kasowa), `Sale` (po zamknięciu). Logika pieniędzy: `orderService.closeOrder` (rabaty/limity,
  opłata serwisowa, lojalność, VAT) — **już istnieje i jest współdzielona**.

### Luki backendu do uzupełnienia pod POS (zaprojektowane tutaj, wdrożone w trakcie)
- **Strukturalne modyfikatory** (dziś wolny tekst w `notes`): model `ModifierGroup` + `ModifierOption`
  z dopłatami, regułami (wymagane/opcjonalne, min/max), przypisaniem do produktów/kategorii.
- **Miejsca (seats) i kursy (courses)** na `TableOrderItem`: pola `seat`, `course` + sterowanie „fire/hold".
- **Płatności i podziały**: model `Payment` (metoda, kwota, napiwek, status) powiązany z rachunkiem;
  obsługa wielu płatności na jeden rachunek (split).
- **Znaczniki czasu realizacji**: `firedAt`/`readyAt`/`servedAt` na pozycji (timing kuchni i SLA).
- **Zdarzenia realtime** emitowane przy zmianach pozycji/rachunku.

---

## 4. Mapa ekranów (information architecture)

```
[PIN / wybór operatora]
        │
        ▼
[Plan sali] ◄──────────────► [Lista / wyszukiwarka rachunków]
   │  (wybór stolika)              (rachunki otwarte, moje, wg statusu)
   ▼
[Rachunek stolika]  ──►  [Menu + dodawanie]  ──►  [Modyfikatory (bottom-sheet)]
   │   │      │                                         
   │   │      └──► [Coursing / miejsca]                 
   │   └──► [Akcje rachunku: rabat, storno, przenieś, łącz, gość]
   ▼
[Płatność]  ──►  [Podział rachunku]  ──►  [Metoda + napiwek]  ──►  [Paragon/fiskalizacja]
                                                                        │
                                                                        ▼
                                                               [Powrót do planu sali]

[Szuflada/zmiana kasowa]   [Tryb baru / szybka sprzedaż]   [Powiadomienia „gotowe do wydania"]
```

Pasek dolny (zawsze dostępny w module): **Sala · Rachunki · Bar · Kasa · Ja (operator)**.

---

## 5. Ekran po ekranie (szczegóły + szkice)

### 5.1 Logowanie / wybór operatora
- Klawiatura PIN (gotowa). Terminal współdzielony: po PIN-ie od razu plan sali; auto-wylogowanie po bezczynności.
- Pierwsze wejście dnia: pytanie o **otwarcie zmiany kasowej** (bilon początkowy) — jeśli polityka tego wymaga.
- Szybkie przełączanie operatora bez wylogowania terminala (ikona „Ja" → „Zmień operatora").

### 5.2 Plan sali (ekran domowy)
```
┌───────────────────────────────────────────────┐
│ Sala główna ▾    [Moje]  [Wszystkie]   🔍  ⟳   │
│                                                 │
│  ┌────┐  ┌────┐   ┌──────┐   ┌────┐            │
│  │ W1 │  │ W2 │   │  W3  │   │ W4 │   stoliki  │
│  │ 12'│  │ ●● │   │ 38' ⚠│   │    │   jako     │
│  └────┘  └────┘   └──────┘   └────┘   kształty │
│  zielony  żółty    czerwony   szary            │
│  (świeży) (jedzą)  (długo)   (wolny)           │
│                                                 │
│  Bar:  [B1][B2][B3][B4]   Ogród: [O1][O2]...   │
└───────────────────────────────────────────────┘
[ Sala ] [ Rachunki ] [ Bar ] [ Kasa ] [ Ja ]
```
- **Stany kolorem i kształtem** (dostępność dla daltonistów): wolny / zajęty-świeży / je / czeka-długo (próg z ustawień) / rachunek poproszony / do wydania.
- **Liczniki czasu** od otwarcia rachunku; ikona ⚠ przy przekroczeniu progu obsługi.
- **Widok mapy** (układ stolików) oraz alternatywny **widok listy** (szybszy przy dużej sali / handheld).
- Filtr **„Moje" vs „Wszystkie"** stoliki; wyszukiwarka po numerze/nazwie/gościu.
- Otwarcie stolika: **1 dotknięcie** → ekran rachunku (jeśli pusty, od razu menu).

### 5.3 Rachunek stolika
```
┌───────────────────────────────────────────────┐
│ ← W3 · 4 os · 38'        [Gość ▾] [⋯ akcje]    │
│ ─────────────────────────────────────────────  │
│  Miejsce 1                                      │
│   1× Burger wołowy            39,00   ● w przyg.│
│       bez cebuli, dobrze wysm.                  │
│   1× Cola 0,3                  9,00   ✓ wydane  │
│  Miejsce 2                                      │
│   1× Sałatka cezar           29,00   ◷ oczekuje │
│ ─────────────────────────────────────────────  │
│  Kurs 1 ▸ wysłany 12:04   Kurs 2 ▸ wstrzymany   │
│ ─────────────────────────────────────────────  │
│  Razem 86,00 zł                                 │
│ [ + Dodaj pozycje ]            [ Płatność ]     │
│ [ Wyślij do kuchni (Kurs 2) ]                   │
└───────────────────────────────────────────────┘
```
- Pozycje grupowane po **miejscach** i **kursach**; status realizacji ikoną i kolorem (mapowanie do `OrderItemStatus`).
- Główne CTA na dole (zasięg kciuka): **Dodaj pozycje** / **Wyślij do kuchni** / **Płatność**.
- `[⋯ akcje]`: rabat (limit kelnera), storno (manager), przenieś stolik, połącz rachunki, przypisz gościa (CRM/lojalność), drukuj wstępny rachunek, notatka.

### 5.4 Menu i dodawanie pozycji
```
┌───────────────────────────────────────────────┐
│ 🔍 Szukaj…           Ulubione · Przystawki ·    │
│                       Dania główne · Napoje ·…  │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                │
│ │Burger│ │Pizza│ │Sałat│ │Frytki│  duże kafle  │
│ │39,00 │ │45,00│ │29,00│ │12,00 │  z ceną      │
│ └─────┘ └─────┘ └─────┘ └─────┘  (86 = wyszarz.)│
│ ─────────────────────────────────────────────  │
│ Koszyk (do wysłania): 2 poz. · 48 zł  [Wyślij→]│
└───────────────────────────────────────────────┘
```
- **Siatka kafli** z ceną i flagą alergenów; pozycje **86** (niedostępne) wyszarzone i nieklikalne.
- **Inteligentne wyszukiwanie** (nazwa/skrót/kategoria) + sekcje **Ulubione / Najczęstsze** (uczone z historii).
- Dodanie kafla: jeśli produkt ma modyfikatory wymagane → otwiera bottom-sheet; jeśli nie → ląduje w koszyku.
- **Koszyk „do wysłania"** zbiera nowe pozycje; jedno **Wyślij** drukuje na właściwych stacjach (routing) i wpada do KDS.

### 5.5 Modyfikatory (bottom-sheet, jeden gest)
```
┌───────────────────────────────────────────────┐
│ Burger wołowy                          39,00 zł │
│ Wysmażenie (wymagane)                           │
│  ( ) krwisty  (•) medium  ( ) dobrze            │
│ Dodatki (max 3)                                 │
│  [+ ser 4]  [+ bekon 6]  [+ jalapeño 3]         │
│ Bez                                             │
│  [ cebula ] [ sos ]                             │
│ Uwagi: [_________________]   🎤                 │
│ Ilość: [ − ] 1 [ + ]            [ Dodaj 39,00 ] │
└───────────────────────────────────────────────┘
```
- **Grupy modyfikatorów** z regułami (wymagane/opcjonalne, min/max), dopłaty widoczne od razu i wliczane.
- „Bez …" jako szybkie wykluczenia; pole **uwag** + dyktowanie głosem.
- Strukturalne dane (nie wolny tekst) → spójny druk na KDS, poprawny food cost i raporty.

### 5.6 Coursing i miejsca (seats)
- Przypisanie pozycji do **miejsca** (kto co zamówił) — fundament sprawiedliwego podziału rachunku.
- **Kursy**: grupowanie pozycji w kursy (przystawki/danie główne/deser); **Fire** (wyślij teraz) / **Hold**
  (wstrzymaj) sterowane z POS, widoczne w kuchni. „Wyślij kurs 2" jednym dotknięciem.

### 5.7 Wysyłka do kuchni + statusy (realtime)
- **Routing po stacjach** (grill/zimna/bar) na podstawie kategorii/produktu.
- Po wysłaniu status pozycji: oczekuje → w przygotowaniu → **gotowe** (z KDS, realtime) → wydane.
- **Powiadomienie „gotowe do wydania"** wraca do kelnera (badge na stoliku + opcjonalny dźwięk/haptyka).

### 5.8 Płatność i podział rachunku
```
Podział:  [ Cały ]  [ Po miejscach ]  [ Po pozycjach ]  [ Po kwocie ]  [ Równo na N ]
Metoda:   [ Gotówka ]  [ Karta/terminal ]  [ BLIK ]  [ Bon ]  [ Na pokój ]
Napiwek:  [ brak ] [ 5% ] [ 10% ] [ 15% ] [ inny ]
```
- **Cztery tryby podziału** + równy podział na N osób; podgląd reszty przy gotówce.
- **Płatności częściowe**: rachunek można domykać wieloma płatnościami (np. 2 karty + gotówka).
- Napiwki wg modelu z ustawień (indywidualny/wspólna pula). Abstrakcja terminala płatniczego (plugin).
- Zamknięcie → `orderService.closeOrder` (rabaty/limit, opłata serwisowa, lojalność, VAT) → `Sale` → paragon/fiskalizacja (abstrakcja, patrz §8).

### 5.9 Rabaty / comp / storno (reguły — już w backendzie)
- **Rabat kelnera** tylko do limitu z ustawień; powyżej → wymagana autoryzacja managera (PIN managera „step-up").
- **Pełne storno/comp** tylko manager/właściciel; **każda operacja audytowana**.
- Powód storna z listy (pomyłka / reklamacja / na koszt lokalu …) — dane do raportów strat.

### 5.10 Zwroty / korekty
- Korekta pozycji przed wysłaniem: natychmiastowa. Po wysłaniu: storno z powodem (reguły jak wyżej).
- Zwrot po zapłacie: osobny, audytowany przepływ z autoryzacją managera.

### 5.11 Tryb baru / szybka sprzedaż
- **Quick sale** bez stolika (sprzedaż na wynos/bar): siatka menu → koszyk → płatność. **Taby** (otwarte
  rachunki barowe na nazwisko/kartę). Minimalna liczba dotknięć dla powtarzalnych zamówień.

### 5.12 Kasa / zmiana (cash drawer)
- Otwarcie zmiany (bilon), ruchy gotówkowe (wpłata/wypłata/drop), **zamknięcie z przeliczeniem** i raportem
  różnic (mapowanie do `CashSession`/`CashMovement`). Z-raport na koniec dnia.

### 5.13 Pay-at-table / handheld / QR
- Ten sam moduł działa na **handheld** (telefon kelnera) — układ jednoekranowy, płatność przy stoliku.
- **QR „zamów & zapłać"** dla gościa współdzieli dane z POS (pozycje wpadają na ten sam rachunek).

---

## 6. Mikrointerakcje, gesty, ergonomia
- **Gesty:** swipe na pozycji (storno/edycja), long-press (szybkie akcje), pull-to-refresh planu sali.
- **Haptyka i dźwięk** na kluczowych zdarzeniach (wysłano, gotowe do wydania, błąd) — z możliwością wyłączenia.
- **Tryb słabego światła** (domyślny ciemny, wysoki kontrast), duża typografia, brak cienkich fontów.
- **Lewo/praworęczność** — opcja lustrzanego układu CTA.

## 7. Stany brzegowe i odporność
- **Offline:** zamówienia i druk kolejkowane; baner stanu sieci; auto-sync po powrocie; idempotencja.
- **Konflikt** (dwóch kelnerów, ten sam rachunek): reguły domeny + atomowe guardy (mamy `serializable()`),
  czytelny komunikat „pozycja zmieniona, odśwież".
- **Utrata sieci w trakcie płatności:** płatność jako maszyna stanów; brak podwójnych obciążeń (idempotency key).
- **Padnięcie urządzenia:** rachunek żyje na serwerze; po ponownym logowaniu operator wraca do stanu.

## 8. Sprzęt, fiskalizacja i peryferia (abstrakcje pod integracje)
- **Terminal płatniczy** (plugin), **drukarka paragonowa/fiskalna** (PL), **szuflada kasowa**, **KDS** (realtime),
  **handheld**. Wszystko za interfejsami sprzętu — POS działa na dowolnym tablecie/telefonie (sprzęt-agnostyczny).
- **Fiskalizacja PL i KSeF** pozostają integracjami zewnętrznymi (poza zakresem MVP modułu), ale z gotowym
  punktem zaczepienia w przepływie zamknięcia rachunku.

---

## 9. „Lepiej niż konkurencja" — mapa decyzji

| Problem rynku (kto) | Nasze lepsze rozwiązanie |
|---|---|
| Modyfikatory na siłę / „modifier hell" / wolny tekst (Lightspeed, Square) | **Open-View bottom-sheet**: pozycja + wszystkie grupy na jednym ekranie, dowolna kolejność, dopłaty na żywo, dyktowanie; dane strukturalne (poprawny KDS, food cost, raporty) |
| Ekran modyfikatorów ładuje się sekundami → rośnie kolejka | **Optymistyczny UI < 100 ms**, dane menu w cache lokalnym; zero spinnerów w gorącej ścieżce |
| Coursing kruchy, druk „od tyłu", limity (Clover, Square) | **Drag-and-drop kursy** + niezawodny **routing stacji** + server firing z czytelnym **HELD** na KDS; brak limitu kursów |
| Słaby/fałszywy offline (Toast, Lightspeed, Revel) | **Offline-first** jako fundament: kolejka mutacji, idempotencja, druk kolejkowany, płatność offline w ramach limitu PCI; sieć lokalna terminali |
| Napiwki przypisane do złej osoby; pooled tips „koszmar" (Revel, Square) | Każda akcja z **PIN operatora** → napiwek/sprzedaż do właściwego kelnera; **przejrzysty** podział puli (mamy modele) |
| Brak dodawania produktu „w locie" (Lightspeed) | **Quick-add / Quick-edit** z POS (86, cena, szybka pozycja) — z autoryzacją wg uprawnień |
| Plan sali dławi się przy 40–50 miejscach (Square) | Wydajny plan (wirtualizacja) + **widok listy** dla dużych sal / handheld |
| QR przypięty do stolika → błędy przy przesiadce (Lightspeed) | **QR przypięty do rachunku**, nie do stolika; auto-rozpoznanie stolika jak SumUp, bez aplikacji gościa |
| Ręczne przepisywanie zamówień z dostaw → błędy | **Inbox „Kanały"** (order injection): Glovo/Wolt/Uber/Pyszne/Bolt wpadają wprost na rachunki/KDS |
| Lock-in: sprzęt + obowiązkowe płatności + umowy + ukryte opłaty (Toast, Lightspeed, Revel) | **Sprzęt-agnostyczny PWA**, płatności jako **plugin**, KDS w jednej platformie (bez dopłat), przejrzysty cennik |
| Stromy onboarding tygodniami (Toast, Lightspeed) | Onboarding w minutach, intuicyjny UX, pomoc AI w kontekście |
| Logowanie z tarciem | **PIN < 1 s** (mamy) + gotowość na **kartę zbliżeniową NFC/RFID** (abstrakcja `AuthMethod` już istnieje) |

---

## 9a. Wymagania rynku polskiego (must-have, za abstrakcjami)
- **Fiskalizacja online (od 2021 obowiązkowa w gastronomii):** wsparcie dla **drukarki fiskalnej** oraz
  **kasy wirtualnej/SoftPOS** (model All-in-One), automatyczny przesył do **CRK**. Punkt zaczepienia w
  przepływie zamknięcia rachunku; fiskalizację robi uprawniony serwisant.
- **KSeF — e-faktury (harmonogram):** odbiór faktur w KSeF od **02.2026** (duzi), wystawianie dla MŚP/
  większości lokali od **04.2026**, najmniejsi od **2027**. POS musi: wystawiać **XML**, transmitować do
  KSeF, pobierać numery KSeF, **weryfikować NIP (GUS)**, działać **offline z synchronizacją**, odbierać
  faktury zakupowe. Dotyczy głównie B2B (catering, eventy, faktury dla firm).
- **Agregatory dostaw na jednym ekranie:** **Glovo, Wolt, Uber Eats, Pyszne.pl, Bolt Food** — wspólny
  inbox „Kanały" (order injection), druk wprost na KDS, bez przepisywania (redukcja błędów).
- Te integracje to **usługi zewnętrzne** (poza MVP modułu), ale projektujemy gotowe punkty zaczepienia.

---

## 10. Plan wdrożenia modułu POS (po akceptacji)

| Krok | Zakres | Zależność |
|---|---|---|
| P0 | Shell `(pos)` + plan sali (read) + wejście PIN | — |
| P1 | Rachunek stolika + dodawanie pozycji + koszyk + wysyłka | model modyfikatorów |
| P2 | Modyfikatory strukturalne + 86 + routing stacji | KDS realtime |
| P3 | Coursing/miejsca + statusy realtime z KDS | Etap 2 (realtime) |
| P4 | Płatność + podziały + napiwki + zamknięcie (Sale) | `Payment` model |
| P5 | Kasa/zmiana + tryb baru + handheld | — |
| P6 | Offline-first (kolejka/sync) + odporność | Etap 2 (offline) |

Na każdym kroku: testy (unit/integration/smoke/E2E) zielone, brak regresji.

---

## 11. Decyzje do akceptacji
1. **Zakres MVP modułu POS** — czy P0–P4 (pełna obsługa stolika + płatność) jako pierwszy „grywalny" POS,
   a P5–P6 zaraz po? (rekomendacja: tak)
2. **Modyfikatory strukturalne** — czy wdrażamy pełny model grup/opcji z dopłatami (rekomendacja: tak,
   to warunek „lepszego niż konkurencja" menu)?
3. **Miejsca (seats) i kursy** — czy włączamy od początku (rekomendacja: tak — przewaga w pełnej obsłudze)?
4. **Tryby podziału rachunku** — potwierdzenie 4 trybów (cały/po miejscach/po pozycjach/po kwocie + równo na N).
5. **Priorytet handheld vs terminal stacjonarny** na start (rekomendacja: projekt responsywny — oba, ale
   testy najpierw na tablecie).

Po Twojej akceptacji (lub korektach) projektu rozpoczynam implementację od kroku P0.
