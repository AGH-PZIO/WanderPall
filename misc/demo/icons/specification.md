# Specyfikacja ikon WanderPall

Konkretna specyfikacja techniczna i wizualna zestawu ikon dla frontendu. Uzupełnia [inventory.md](./inventory.md).

---

## 1. Biblioteka

| Parametr | Wartość |
|----------|---------|
| **Pakiet** | [`lucide-react`](https://lucide.dev/) |
| **Wersja** | najnowsza stabilna z `npm` |
| **Import** | Named imports per ikona (tree-shaking) |
| **Alternatywa** | SVG sprite w `frontend/src/shared/icons/` — tylko jeśli Lucide nie wchodzi w grę |

```tsx
import { MapPin, Trash2, X } from "lucide-react";
```

---

## 2. Styl wizualny

| Właściwość | Wartość | Uwagi |
|------------|---------|-------|
| Wariant | **Outline** (domyślny Lucide) | Spójny z obecnym lekkim UI |
| `viewBox` | `0 0 24 24` | Standard Lucide |
| `strokeWidth` | `2` | Domyślne; `1.75` opcjonalnie w dense UI (Maps toolbar) |
| Wypełnienie | Brak (`fill="none"`) | Wyjątek: ikony „filled” tylko dla stanu aktywnego (opcjonalnie) |
| Zaokrąglenie | Domyślne Lucide (`round` cap/join) | — |
| Kolor | `currentColor` | Dziedziczy z CSS — **nie** hardcodować hex w komponentach |

### Tokeny koloru (CSS)

```css
--icon-primary: var(--text-primary);
--icon-secondary: var(--text-secondary);
--icon-muted: var(--text-muted);
--icon-accent: var(--accent-500);      /* z design systemu / theme */
--icon-danger: var(--danger, #C94444);
--icon-success: var(--success, #2D8A5E);
--icon-on-accent: #FFFFFF;             /* ikona na tle accent-500 */
```

---

## 3. Rozmiary

| Token | px | Użycie |
|-------|-----|--------|
| `icon-xs` | 16 | Inline w tekście, badge, gęsty toolbar Maps |
| `icon-sm` | 20 | Sidebar, lista, przyciski secondary |
| `icon-md` | 24 | Domyślny — karty home, empty states, topbar |
| `icon-lg` | 32 | Empty state hero, kafelki modułów na home App |

Komponent opakowujący (do wdrożenia w `shared/ui/Icon.tsx`):

```tsx
type IconSize = "xs" | "sm" | "md" | "lg";

const SIZE_MAP: Record<IconSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
};
```

---

## 4. Komponent bazowy

Propozycja API:

```tsx
<Icon icon={MapPin} size="md" label="Dodaj znacznik" />
```

| Prop | Typ | Opis |
|------|-----|------|
| `icon` | `LucideIcon` | Komponent z lucide-react |
| `size` | `IconSize` | Patrz tabela rozmiarów |
| `label` | `string?` | `aria-label` gdy ikona jest jedyną treścią przycisku |
| `className` | `string?` | Klasy utility (kolor przez `text-*`) |

**Zasady dostępności:**

- Przycisk **tylko z ikoną** → wymagany `aria-label`.
- Ikona **dekoracyjna** obok tekstu → `aria-hidden={true}`.
- Minimalny target klikalny: **40×40 px** (padding wokół ikony 20–24 px).

---

## 5. Mapowanie: obecna forma → Lucide

### 5.1 Tier 1 — priorytet (już w użyciu)

#### Akcje globalne

| ID | Znaczenie | Było | Lucide | Rozmiar |
|----|-----------|------|--------|---------|
| `action.close` | Zamknij moduł / panel | `✕` | `X` | sm |
| `action.back` | Wstecz | `←` | `ArrowLeft` | sm |
| `action.check` | Sukces / ukończone | `✓` | `Check` | sm |
| `action.check-circle` | Toast sukces | `✓` | `CircleCheck` | md |
| `action.error` | Toast błąd | `✕` | `CircleX` | md |
| `action.info` | Toast info | `ℹ` | `Info` | md |
| `action.plus` | Dodaj / utwórz | `+` | `Plus` | sm |
| `action.trash` | Usuń | SVG/`✕` | `Trash2` | sm |
| `action.edit` | Edytuj | `✎` | `Pencil` | sm |
| `action.download` | Pobierz / GPX | `⬇` | `Download` | sm |
| `action.search` | Szukaj | 🔎 | `Search` | sm |
| `action.print` | Drukuj mapę | 🖨 | `Printer` | sm |
| `action.locate` | Moja lokalizacja | 📡 | `LocateFixed` | sm |
| `action.lock` | Wymaga logowania | 🔐 | `Lock` | lg |
| `action.upload` | Załącz plik | tekst | `Paperclip` | sm |
| `action.send` | Wyślij wiadomość | tekst | `Send` | sm |
| `action.sync` | Odśwież / sync | tekst | `RefreshCw` | sm |

#### Travel Assistance — kafelki i empty states

| ID | Znaczenie | Było | Lucide | Rozmiar |
|----|-----------|------|--------|---------|
| `feature.mail` | Email Documents | 📧 | `Mail` | lg |
| `feature.guides` | Travel Guides | 📖 | `BookOpen` | lg |
| `feature.translator` | Translator | 🌐 / 🌍 | `Globe` | lg |
| `feature.calendar` | Calendar | 📅 | `Calendar` | lg |
| `feature.notes` | Notes | 🗒️ | `NotebookPen` | lg |
| `feature.calculator` | Calculator | 🖩 / 🧮 | `Calculator` | lg |
| `feature.location` | Lokalizacja w evencie | 📍 | `MapPin` | xs |

#### Maps — toolbar i piny

| ID | Znaczenie | Było | Lucide | Rozmiar |
|----|-----------|------|--------|---------|
| `map.add-marker` | Dodaj znacznik | 📍 | `MapPin` | sm |
| `map.draw-route` | Narysuj trasę | ✏️ | `Route` | sm |
| `map.search-pin` | Pin wyszukiwania | 🔎 | `MapPin` + overlay `Search`* | xs |
| `map.comment` | Komentarze | 💬 | `MessageCircle` | xs |
| `map.add-vertex` | Punkt na trasie | `+` | `Plus` | xs |
| `map.export-gpx` | Eksport GPX | ⬇ | `Download` | sm |
| `map.groups` | Grupy / empty | 🗺️ | `Map` | lg |

\* Pin wyszukiwania: `MapPin` w kolorze accent + mała `Search` w rogu, albo dedykowany wrapper.

#### Maps — kategorie znaczników

| ID | Kategoria | Było | Lucide | Uwagi |
|----|-----------|------|--------|-------|
| `category.restaurant` | Restauracja | 🍽️ | `UtensilsCrossed` | W pinie: biała na tle kategorii |
| `category.hotel` | Hotel / nocleg | 🏨 | `Bed` | j.w. |
| `category.sightseeing` | Zabytek / atrakcja | 🏛️ | `Landmark` | j.w. |
| `category.transport` | Transport | 🚆 | `TrainFront` | j.w. |
| `category.nature` | Natura | 🌳 | `TreePine` | j.w. |
| `category.shopping` | Zakupy | 🛍️ | `ShoppingBag` | j.w. |
| `category.other` | Inne | 📍 | `MapPin` | domyślna |

Pin na mapie (Leaflet): okrągły badge 32×32 px, ikona `icon-xs` (16 px), kolor `#fff`, tło `--pin-visited` / `--pin-default`.

#### Travel Buddies — empty states

| ID | Znaczenie | Było | Lucide | Rozmiar |
|----|-----------|------|--------|---------|
| `buddies.empty` | Brak grup | ✈️ | `Plane` | lg |

---

### 5.2 Tier 2 — brakuje dziś, potrzebne przy ujednoliceniu

#### Strona główna App

| ID | Moduł | Lucide | Rozmiar |
|----|-------|--------|---------|
| `module.account` | Account | `User` | lg |
| `module.travel-assistance` | Travel Assistance | `Compass` | lg |
| `module.travel-buddies` | Travel Buddies | `Users` | lg |
| `module.maps` | Maps | `Map` | lg |
| `module.journal` | Journal | `BookMarked` | lg |

#### Account

| ID | Ekran | Lucide |
|----|-------|--------|
| `account.profile` | Profile | `User` |
| `account.theme` | Theme | `Palette` |
| `account.theme-light` | Light mode | `Sun` |
| `account.theme-dark` | Dark mode | `Moon` |
| `account.delete` | Delete account | `UserX` |
| `account.login` | Sign in | `LogIn` |
| `account.register` | Create account | `UserPlus` |
| `account.password` | Forgot password | `KeyRound` |

#### Travel Buddies — zakładki

| ID | Zakładka | Lucide |
|----|----------|--------|
| `tab.members` | Członkowie | `Users` |
| `tab.polls` | Ankiety | `BarChart3` |
| `tab.tasks` | Zadania | `ListChecks` |
| `tab.notes` | Notatki | `StickyNote` |
| `tab.packing` | Pakowanie | `Luggage` |

#### Edytor przewodnika — typy bloków

| ID | Typ bloku | Lucide |
|----|-----------|--------|
| `block.heading` | Heading | `Heading` |
| `block.paragraph` | Paragraph | `AlignLeft` |
| `block.image` | Image | `Image` |
| `block.video` | Video | `Video` |
| `block.audio` | Audio | `AudioLines` |

#### Integracje i stany

| ID | Znaczenie | Lucide |
|----|-----------|--------|
| `integration.google` | Connect Google | `Link` *(logo Google osobno, jeśli wymagane)* |
| `state.loading` | Ładowanie | `LoaderCircle` + animacja `spin` |
| `state.warning` | Ostrzeżenie | `TriangleAlert` |
| `mail.attachment` | Załącznik maila | `Paperclip` |

#### Journal (przyszłość)

| ID | Znaczenie | Lucide |
|----|-----------|--------|
| `journal.entry` | Wpis | `FileText` |
| `journal.public` | Publiczny | `Eye` |
| `journal.private` | Prywatny | `EyeOff` |
| `journal.saved` | Zapisany | `Bookmark` |
| `journal.comment` | Komentarz | `MessageSquare` |

---

### 5.3 Tier 3 — reakcje (emoji → opcjonalna migracja)

Obecnie emoji w `GroupDetailPage` i `ChatPage`. **Rekomendacja:** zostawić emoji w UI reakcji (natywne, rozpoznawalne) **albo** zamienić na kolorowe badge z emoji wewnątrz — **nie** mapować na Lucide.

| Było | Znaczenie | Decyzja |
|------|-----------|---------|
| 👍 | Lubię to | Zostawić emoji |
| ❤️ | Serce | Zostawić emoji |
| 😄 | Śmiech | Zostawić emoji |
| 🔥 | Fire | Zostawić emoji |
| 😮 | Zaskoczenie | Zostawić emoji |
| 😢 | Smutek (tylko Chat) | Zostawić emoji |

Jeśli kiedyś SVG: osobny zestaw „reaction stickers”, nie Lucide.

---

## 6. Pin mapy — specyfikacja techniczna

Leaflet `divIcon` (zastępuje emoji w `buildCategoryDivIcon`):

```
┌──────────────┐
│   ○ 32×32    │  border-radius: 50%
│  [icon 16px] │  tło: #2563eb (nieodwiedzone) / #22c55e (odwiedzone)
│         💬?  │  badge komentarza: 14px, prawy górny róg
└──────────────┘
```

| Stan | Tło pinu | Obramowanie |
|------|----------|-------------|
| Domyślny | `#2563eb` | — |
| Odwiedzony | `#22c55e` | — |
| Wybrany | bez zmian | `box-shadow: 0 0 0 3px accent` |
| Komentarze | badge `MessageCircle` | prawy górny róg |

Render: `<Icon icon={UtensilsCrossed} size="xs" className="maps-pin-icon" />` w HTML pinu **lub** inline SVG string dla Leaflet.

---

## 7. Wierzchołki trasy

**Bez zmiany koncepcji** — numery 1, 2, 3… w kółku (nie ikony Lucide).

Opcjonalnie dodatkowe etykiety tekstowe START / META — bez ikon, lub `Flag` / `FlagTriangleRight` w przyszłości.

---

## 8. Pliki do utworzenia / zmodyfikować (frontend)

| Plik | Zmiana |
|------|--------|
| `frontend/package.json` | Dodać `lucide-react` |
| `frontend/src/shared/ui/Icon.tsx` | Komponent opakowujący |
| `frontend/src/shared/icons/registry.ts` | Mapa `id → LucideIcon` (Tier 1–2) |
| `frontend/src/modules/maps/types.ts` | `CATEGORY_DISPLAY`: emoji → `iconId` |
| `frontend/src/modules/maps/ui/MapView.tsx` | Render SVG w pinach |
| `frontend/src/modules/maps/ui/maps.css` | Usunąć `.maps-icon-trash` mask po migracji na `Trash2` |
| Moduły TA, Buddies, Account | Zamiana emoji/Unicode na `<Icon />` |

---

## 9. Pełna lista ID ikon (alfabetycznie)

Do rejestru `registry.ts`:

```
account.delete
account.login
account.password
account.profile
account.register
account.theme
account.theme-dark
account.theme-light
action.back
action.check
action.check-circle
action.close
action.download
action.edit
action.error
action.info
action.locate
action.lock
action.plus
action.print
action.search
action.send
action.sync
action.trash
action.upload
block.audio
block.heading
block.image
block.paragraph
block.video
buddies.empty
category.hotel
category.nature
category.other
category.restaurant
category.shopping
category.sightseeing
category.transport
feature.calculator
feature.calendar
feature.guides
feature.location
feature.mail
feature.notes
feature.translator
integration.google
journal.comment
journal.entry
journal.private
journal.public
journal.saved
mail.attachment
map.add-marker
map.add-vertex
map.comment
map.draw-route
map.export-gpx
map.groups
map.search-pin
module.account
module.journal
module.maps
module.travel-assistance
module.travel-buddies
state.loading
state.warning
tab.members
tab.notes
tab.packing
tab.polls
tab.tasks
```

**Łącznie: 68 ID** (Tier 1 + 2 + Journal future; bez reakcji emoji).

---

## 10. Kolejność wdrożenia

1. `Icon.tsx` + `registry.ts` + `lucide-react`
2. Akcje globalne (`close`, `back`, `trash`, toasty)
3. Maps — kategorie pinów + toolbar + kosz
4. Travel Assistance — kafelki home + empty states
5. Travel Buddies — empty states + zakładki
6. Account + home App — karty modułów
7. Guide editor — typy bloków
8. Journal — przy implementacji modułu

---

## 11. Czego unikać

- Mieszania emoji i Lucide w **tym samym rzędzie** UI (np. toolbar Maps).
- Hardcodowania kolorów ikon poza tokenami CSS.
- Ikony bez `aria-label` na przyciskach icon-only.
- Osobnych bibliotek (Font Awesome + Lucide + własne SVG).
- Zamiany reakcji emoji na outline icons — wyglądają słabiej niż natywne emoji.
