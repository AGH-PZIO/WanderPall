# Konwencja C1 — Together

**Charakter:** produktowy interfejs podróżniczy z emocjonalną stroną wejścia i spokojnym workspace wewnątrz aplikacji. Bazuje na typografii i teal z Horizon, uzupełniony ciepłym brązem jako kolorem towarzyszącym.

## Filozofia

Together łączy **landing emocjonalny** (wideo w tle, animowany nagłówek, duży CTA) z **praktycznym panelem aplikacji** (topbar + sidebar, workflow użytkownika). Strona główna nie ma bocznej nawigacji — prowadzi do akcji. Po wejściu w aplikację użytkownik dostaje pełną strukturę nawigacyjną produktu.

Inspiracja: wspólne podróżowanie, ciepło wspomnień (brąz) i spokój planowania (teal).

## Paleta kolorów

### Akcent — Teal (główny kolor marki)

| Token | Wartość | Zastosowanie |
|-------|---------|--------------|
| `--accent-50` | `#E6F4F1` | Tła hover, badge'e w trybie jasnym |
| `--accent-100` | `#C2E6DE` | Tła tagów, wyróżnienia drugorzędne |
| `--accent-200` | `#8FD4C6` | Obramowania aktywne, ikony pomocnicze |
| `--accent-300` | `#5BBFA9` | Linki hover, progress |
| `--accent-400` | `#2FA88E` | Przyciski secondary hover |
| `--accent-500` | `#0D6B5C` | **Główny akcent** — CTA, linki, focus ring |
| `--accent-600` | `#0A5749` | CTA hover (light mode) |
| `--accent-700` | `#074236` | Tekst akcentowy na jasnym tle |
| `--accent-800` | `#052E26` | Ciemne warianty badge |
| `--accent-900` | `#031915` | Głębokie tła akcentowe |

### Secondary — Brown

| Token | Wartość | Zastosowanie |
|-------|---------|--------------|
| `--brown-50` | `#F8F4F0` | Tła kart ciepłych, highlight |
| `--brown-100` | `#EDE4DA` | Tagi, delikatne tła |
| `--brown-200` | `#D9C9B8` | Obramowania dekoracyjne |
| `--brown-300` | `#C4A990` | Tekst „razem.” na landingu |
| `--brown-400` | `#A8856A` | Podkreślenia, akcenty wtórne |
| `--brown-500` | `#8B6342` | **Brąz główny** — wyróżnienia editorialne |
| `--brown-600` | `#6F4F34` | Hover, gradient logo |
| `--brown-700` | `#523D29` | Tekst brązowy na jasnym tle |
| `--brown-800` | `#3A2B1E` | Ciemne warianty |
| `--brown-900` | `#241A12` | Głębokie tła brązowe |

### Neutrals — Stone

| Token | Light | Dark |
|-------|-------|------|
| `--surface-0` | `#FFFFFF` | `#1A211E` |
| `--surface-1` | `#F8FAF9` | `#121816` |
| `--surface-2` | `#EEF2F0` | `#232B28` |
| `--surface-3` | `#E2E8E5` | `#2E3834` |
| `--text-primary` | `#141A18` | `#E8EDEA` |
| `--text-secondary` | `#5C6B65` | `#9AABA3` |
| `--text-muted` | `#8A9892` | `#6B7A74` |
| `--border` | `#D8E0DC` | `#3A4541` |

### Semantyczne

| Token | Wartość | Zastosowanie |
|-------|---------|--------------|
| `--success` | `#2D8A5E` | Potwierdzenia, status OK |
| `--warning` | `#C47A1A` | Ostrzeżenia, oczekujące |
| `--danger` | `#C94444` | Błędy, usuwanie |
| `--info` | `#3A7CA5` | Informacje neutralne |

## Typografia

- **Display / nagłówki:** [Fraunces](https://fonts.google.com/specimen/Fraunces) — jak w Horizon; na landingu w dużym formacie display.
- **UI / body:** [DM Sans](https://fonts.google.com/specimen/DM+Sans) — interfejs aplikacji, formularze, nawigacja.

| Poziom | Rozmiar | Waga | Line-height |
|--------|---------|------|-------------|
| Hero display | clamp(2.5–4.5rem) | 600 | 1.15 |
| H1 | 2rem / 32px | 600 | 1.2 |
| H2 | 1.5rem / 24px | 600 | 1.3 |
| H3 | 1.125rem / 18px | 600 | 1.4 |
| Body | 1rem / 16px | 400 | 1.6 |
| Small | 0.875rem / 14px | 400 | 1.5 |
| Caption | 0.75rem / 12px | 500 | 1.4 |

## Layout

- **Landing** (`index.html`): cienki topbar (48px), pełnoekranowy hero bez sidebara.
- **Aplikacja**: topbar + sidebar (240px) + content area.
- **Topbar**: logo, przełącznik motywu, logowanie, konto.
- **Sidebar**: nawigacja produktowa + rozwijane menu „Narzędzia”.
- Maksymalna szerokość treści: **1120px**.

## Promienie i cienie

| Token | Wartość |
|-------|---------|
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 16px |
| `--radius-full` | 9999px |
| `--shadow-sm` | `0 1px 2px rgba(20, 26, 24, 0.06)` |
| `--shadow-md` | `0 4px 12px rgba(20, 26, 24, 0.08)` |
| `--shadow-lg` | `0 12px 32px rgba(20, 26, 24, 0.12)` |

## Komponenty

### Landing
- Hero z rotującymi klipami wideo (5 s, overlay ~60–78% ciemności).
- Animowany nagłówek: `[słowo] razem.` — „razem.” w `--brown-300`, podkreślone.
- CTA **„W drogę!”** — duży primary (`btn--hero`).
- Stopka hero: „Przejrzyj projekt” + „tryb deweloperski”.

### Nawigacja aplikacji
- Aktywny link sidebara: tło `--accent-50`, lewa krawędź `--accent-500`.
- Menu „Narzędzia” rozwijane (kalkulator, tłumacz, kalendarz).

### Przyciski
- **Primary:** `--accent-500`, hover `--accent-600`.
- **Secondary (app):** obramowanie `--border`, tło przezroczyste.
- **Secondary (hero):** biały obrys na ciemnym tle wideo.
- **Hero CTA:** Fraunces, padding 20×56px, `--shadow-lg`.

## Tryb jasny i ciemny

Przełącznik w topbarze. Preferencja w `localStorage` (`wp-c1-theme`). Domyślnie `prefers-color-scheme`.

## Ruch i interakcja

- Transition: `150ms ease` (UI), `250ms ease-out` (layout).
- Rotacja słów w hero co ~2.8 s.
- Crossfade klipów wideo co 5 s.

## Różnica względem Horizon (1)

| Aspekt | Horizon | Together (C1) |
|--------|---------|---------------|
| Wejście | Dashboard od razu | Landing emocjonalny + dev entry |
| Layout | Sidebar only | Topbar + sidebar w app |
| Drugi kolor | Brak | Skala brown 50–900 |
| Nawigacja | Demo modułów | Workflow produktu (Trips, Groups…) |

## Demo

Folder `demo/` zawiera statyczną witrynę:

- `index.html` — landing z wideo i animowanym nagłówkiem
- `dashboard.html` — panel użytkownika
- `trips.html` — lista planów podróży
- `detail.html` — szczegóły wyjazdu
- `components.html` — paleta kolorów, typografia, komponenty UI
- `calculator.html`, `translator.html`, `calendar.html` — narzędzia
- pozostałe strony placeholder (Groups, Guides, Journal, Account)

Uruchomienie: otwórz `designs/C1/demo/index.html` w przeglądarce lub serwuj folder `designs/C1/demo/` lokalnym serwerem HTTP.
