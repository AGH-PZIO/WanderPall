# Strona główna (landing) — opis

Implementacja: `misc/demo/C1/demo/index.html` (konwencja Together · C1).

Strona główna to pełnoekranowy landing **bez bocznej nawigacji**. Jedyny stały element nawigacyjny to cienki **topbar** u góry. Po wejściu w aplikację (przycisk „Przejrzyj projekt”) użytkownik przechodzi do widoku z sidebarem.

---

## Topbar (48px)

- **Lewa strona:** logo kolorowe z `assets/logo/`
  - Desktop: pełne logo `WanderPall-logo_color_full.svg`
  - Mobile (<768px): sam znak `WanderPall-logo_color.svg` (pełne logo jest zbyt szerokie)
- **Prawa strona:**
  - przełącznik trybu jasny / ciemny (ikony słońce / księżyc)
  - **Zaloguj** / **Wyloguj** (stan demo w `localStorage`)
  - **Konto** (ukryte na wąskich ekranach)
  - akcje z monochromatycznymi ikonami outline (log-in, log-out, user)

---

## Hero — układ dwukolumnowy (desktop)

Treść hero jest podzielona na dwie strefy, rozdzielone pionową linią (`rgba(255,255,255,0.18)`).

### Lewa kolumna — marka

- Ikona kolorowa: `WanderPall-logo_color.svg`
- Pod spodem napis marki w Fraunces:
  - **Wander** — kolor teal (`--accent-300`)
  - **Pall** — kolor brown (`--brown-300`)

### Prawa kolumna — komunikat

- Duży nagłówek: **XXXXX razem.**
  - **XXXXX** — animacja rotacji słów co ~2,8 s (fade + lekki ruch pionowy)
  - **razem.** — kolor brown, podkreślone
  - Słowa w rotacji:
    - Podróżuj
    - Planuj
    - Dziel się
    - Zwiedzaj
    - Twórz wspomnienia
    - Przeżywaj
    - Nocuj
    - Ekscytacja
    - Wspominaj
- Główny CTA: przycisk **„W drogę!”**
  - większy niż standardowy (`btn--hero`), teal, Fraunces
  - ikona strzałki w prawo (outline, monochromatyczna) po tekście

---

## Stopka hero (dół ekranu)

Na dole widoku hero, wyśrodkowane:

- przycisk **„Przejrzyj projekt”** → `dashboard.html` (wejście w tryb deweloperski / aplikację)
- pod spodem drobny tekst: **tryb deweloperski**

*(Pierwotny opis przewidywał oba przyciski jeden pod drugim na środku ekranu; obecnie główny CTA jest przy nagłówku po prawej, a wejście deweloperskie przeniesiono na dół strony.)*

---

## Tło wideo

- Zapętlona rotacja klipów co **5 s** z crossfade (~1 s)
- Ciemny overlay gradientowy (~55–78%), żeby treść pozostawała czytelna
- Klipy: 4 filmy podróżnicze z Pexels w jakości **SD** (640×360), wzorzec URL w `assets/clips/url.txt`:
  - `https://www.pexels.com/download/video/{ID}/?fps=...&h=360&w=640`
- Przy błędzie pobrania z sieci — fallback na lokalne pliki z `assets/clips/` (symlink `demo/clips/`)

---

## Mobile

- Kolumny hero układają się pionowo: marka u góry, komunikat pod spodem
- Linia rozdzielająca staje się poziomą
- Tekst nagłówka i CTA wyśrodkowany
- W topbarze: znak zamiast pełnego logo; link „Konto” ukryty

---

## Czego nie ma na landingu

- Brak sidebara i menu modułów — nawigacja produktowa pojawia się dopiero po przejściu do `dashboard.html` i dalszych podstron aplikacji.
