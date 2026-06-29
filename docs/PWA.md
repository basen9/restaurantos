# RestaurantOS jako aplikacja (PWA) + sesje

Realizacja funkcji #2 ze zrzutów: system ma być codziennym narzędziem całego zespołu —
na komputerach, tabletach i telefonach, instalowalny jak natywna aplikacja, z wygodnymi sesjami.

## Co działa

### Progressive Web App (instalacja bez sklepu)
- **Web App Manifest** (`app/manifest.ts` → `/manifest.webmanifest`): nazwa, ikony 192/512 (w tym maskable), `display: standalone`, kolory motywu.
- **Service worker** (`public/sw.js`): instalowalność + lekki cache powłoki. Strategia: network-first dla nawigacji z fallbackiem `offline.html`, cache-first dla statycznych zasobów. **`/api` nigdy nie jest cache'owane** (dane wrażliwe/na żywo).
- **Rejestracja SW + przycisk instalacji** (`components/pwa/PwaProvider.tsx`): na Androidzie/desktopie pojawia się „Zainstaluj"; na iPhone przez Safari → „Dodaj do ekranu początkowego".
- Ikony aplikacji i `apple-touch-icon`, `theme-color`, `viewport-fit=cover` (notch).

**Instalacja:**
- **Android (Chrome):** baner „Zainstaluj RestaurantOS" lub menu → „Zainstaluj aplikację".
- **iPhone (Safari):** Udostępnij → „Dodaj do ekranu początkowego".
- **Desktop (Chrome/Edge):** ikona instalacji w pasku adresu.

### Responsywność
Interfejs jest w pełni responsywny — boczne menu zwija się w szufladę (drawer) na telefonach (`components/layout/AppShell.tsx`), siatki kart dopasowują liczbę kolumn (telefon → tablet → desktop).

### Wygodne i bezpieczne sesje
- Sesja JWT ważna **8 godzin** (`lib/auth.ts`) — użytkownik **nie jest wylogowywany co kilka minut**; po instalacji PWA pozostaje zalogowany między otwarciami.
- Logowanie bezpieczne: bcrypt, podpisany JWT, throttling prób logowania, twardy wymóg silnego sekretu na produkcji.

## Element zależny od urządzenia: biometria (Face ID / Touch ID)

W przeglądarce/PWA biometria to **WebAuthn (passkeys)** — logowanie odciskiem/twarzą realizuje
platformowy autentykator urządzenia. Wymaga:
1. modelu poświadczeń po stronie serwera (klucz publiczny + identyfikator credentiala per urządzenie),
2. przepływu rejestracji (`navigator.credentials.create`) i logowania (`navigator.credentials.get`) z wyzwaniem (challenge) i weryfikacją podpisu,
3. integracji z NextAuth.

Jest to funkcja **gated na konkretne urządzenie z autentykatorem** i nie da się jej rzetelnie
zweryfikować w środowisku headless (brak czytnika biometrii). Dlatego dostarczamy pełne PWA
i trwałe sesje (powyżej), a passkeys/biometria pozostają zaplanowane jako kolejny, dedykowany
krok bezpieczeństwa — tak, by nie wprowadzać niesprawdzonego kodu uwierzytelniania.
Po instalacji PWA system OS i tak może chronić aplikację biometrią urządzenia, a 8-godzinna
sesja minimalizuje liczbę logowań.
