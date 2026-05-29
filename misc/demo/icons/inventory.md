# Inwentaryzacja ikon — stan obecny w WanderPall

Audyt frontendu na podstawie plików w `frontend/src/`. Data audytu: maj 2026.

---

## Podsumowanie źródeł

| Źródło | Gdzie występuje | Uwagi |
|--------|-----------------|-------|
| Emoji | Travel Assistance, Maps, Travel Buddies | Główne „ikony” funkcji i kategorii |
| Unicode | Nawigacja, toasty, akcje inline | `✕`, `←`, `✓`, `✎`, `⬇`, `+`, `×`, `→` |
| SVG (CSS mask) | Maps — usuwanie | Jedyna prawdziwa ikona wektorowa |
| Brak ikon | Account, strona główna App, zakładki Buddies | Same karty / etykiety tekstowe |

---

## 1. Wspólne (cała aplikacja)

| Znaczenie | Obecna forma | Pliki / kontekst |
|-----------|--------------|------------------|
| Zamknij moduł | `✕` | `AccountPage`, `TravelAssistancePage`, `MapsPage`, `TravelBuddiesPage` |
| Wstecz | `←` / „← Back” / „← Wróć” / „← Grupy” | Podstrony TA, Maps, Buddies |
| Toast — sukces | `✓` | `shared/ui/Toast.tsx` (`kind: "ok"`) |
| Toast — błąd | `✕` | `Toast.tsx` (`kind: "err"`) |
| Toast — info | `ℹ` | `Toast.tsx` (`kind: "info"`) |
| Dodaj / nowy | `+` w tekście | „+ Nowa grupa”, „+ New note”, „+ Add category”, „+ New guide” |
| Usuń | `✕` lub SVG kosza | Zadania, notatki, pakowanie; Maps — `maps-icon-trash` |
| Edytuj | `✎` | Maps — nazwy tras/znaczników, komentarze |
| Zapisz / ukończone | `✓` | Maps — zapis trasy; checkbox zadań i pakowania |
| Pobierz | „Download” / `⬇` | Mail, eksport GPX w Maps |
| Wymaga logowania | `🔐` | Maps, Buddies, `AuthRequiredGate` |
| Motyw jasny/ciemny | Brak ikony | `ThemePage` — select tekstowy `light` / `dark` |

---

## 2. Strona główna (`App.tsx`)

Moduły na home **nie mają ikon** — tylko tekst (`Module 01`, nazwa, opis):

| Moduł | ID | Ikona dziś |
|-------|-----|------------|
| Account | `account` | brak |
| Travel Assistance | `travel-assistance` | brak |
| Travel Buddies | `travel-buddies` | brak |
| Maps | `maps` | brak |
| Journal | `journal` | brak (moduł bez UI) |

---

## 3. Account (`modules/account/`)

**Brak ikon** — karty tekstowe w `HomePage.tsx`:

| Ekran | Route | Ikona dziś |
|-------|-------|------------|
| Profile | `/account/profile` | brak |
| Theme | `/account/theme` | brak |
| Delete account | `/account/delete` | brak |
| Sign in | `/account/login` | brak |
| Create account | `/account/register` | brak |
| Forgot password | `/account/password-reset` | brak |

Topbar: `✕` (zamknij) w `AccountPage.tsx`.

---

## 4. Travel Assistance (`modules/travel-assistance/`)

### Kafelki home (`pages/Home.tsx`)

| Funkcja | Emoji | Route |
|---------|-------|-------|
| Email Documents | 📧 | `mail` |
| Travel Guides | 📖 | `browse-guides` |
| Translator | 🌐 | `translator` |
| Calendar | 📅 | `calendar` |
| Notes | 🗒️ | `notes` |
| Calculator | 🖩 *(błędny znak Unicode)* | `my-calculations` |

### Stany puste (`ta-empty-icon`)

| Ekran | Emoji | Plik |
|-------|-------|------|
| Przewodniki (browse / my) | 📖 | `BrowseGuidesPage`, `MyGuides` |
| Kalkulacje | 🧮 | `MyCalculations` |
| Notatki | 🗒️ | `NotesPage` |
| Mail | 📧 | `MailPage` |
| Translator | 🌍 | `TranslatorPage` |

### Auth gate (`AuthRequiredGate.tsx`)

| Element | Emoji |
|---------|-------|
| Wymaga logowania | 🔐 |

### Edytor przewodnika (`Guide.tsx`) — przyciski tekstowe

| Typ bloku | Etykieta przycisku | Ikona dziś |
|-----------|-------------------|------------|
| Nagłówek | „Heading” | brak |
| Akapit | „Paragraph” | brak |
| Obraz | „Image” | brak |
| Wideo | „Video” | brak |
| Audio | „Audio” | brak |

### Inne elementy TA

| Element | Obecna forma | Plik |
|---------|--------------|------|
| Lokalizacja w wydarzeniu kalendarza | 📍 | `CalendarPage.tsx` |
| Połączenie Google (mail, calendar) | Tekst „Connect with Google” | `MailPage`, `CalendarPage` |
| Sync / odśwież | Tekst + klasa `btn-syncing` | `MailPage`, `CalendarPage`, `TranslatorPage` |
| Usuń pozycję w kalkulacji | `✕` | `Calculation.tsx` |
| Nawigacja wstecz | `← Back` | Wiele stron TA |

Topbar modułu: `✕` w `TravelAssistancePage.tsx`.

---

## 5. Maps (`modules/maps/`)

### Toolbar (`GroupMapPage.tsx`)

| Akcja | Obecna forma |
|-------|--------------|
| Wróć do grup | `← Grupy` |
| Dodaj znacznik | 📍 Dodaj znacznik |
| Narysuj trasę | ✏️ Narysuj trasę |
| Szukaj miejsca | 🔎 w placeholderze inputu |
| Moja lokalizacja | 📡 Moja lokalizacja |
| Drukuj mapę | 🖨 Drukuj |

### Menu kontekstowe mapy

| Akcja | Emoji |
|-------|-------|
| Dodaj znacznik tutaj | 📍 |

### Panel wyszukiwania

| Akcja | Emoji |
|-------|-------|
| Dodaj jako znacznik | 📍 |

### Kategorie znaczników (`types.ts` → `CATEGORY_DISPLAY`)

Używane na mapie (Leaflet pin), w filtrach i listach:

| Kategoria (enum) | Etykieta PL | Emoji |
|------------------|-------------|-------|
| `restaurant` | Restauracja | 🍽️ |
| `hotel` | Hotel / nocleg | 🏨 |
| `sightseeing` | Zabytek / atrakcja | 🏛️ |
| `transport` | Transport | 🚆 |
| `nature` | Natura | 🌳 |
| `shopping` | Zakupy | 🛍️ |
| `other` | Inne | 📍 |

### Nakładki mapy (`MapView.tsx`)

| Element | Obecna forma |
|---------|--------------|
| Podgląd wyszukiwania (pin) | 🔎 |
| Badge komentarzy na pinie | 💬 |
| Dodaj punkt na krawędzi trasy | `+` (HTML w markerze) |
| Wierzchołki trasy | Numery 1, 2, 3… |
| Etykiety start/meta | Tekst START / META |
| Tooltip z komentarzami | 💬 w tekście tooltipa |

### Sidebar / akcje Maps

| Akcja | Obecna forma |
|-------|--------------|
| Usuń znacznik / trasę / komentarz / punkt | **SVG kosz** (`maps-icon-trash`) |
| Edytuj trasę | ✎ Edytuj trasę |
| Eksport GPX | ⬇ Eksportuj GPX |
| Zapisz trasę | ✓ Zapisz / Utwórz trasę |
| Zamknij panel | ✕ |
| Podpowiedź edycji nazwy | ✎ (`maps-edit-hint`) |
| Odwiedzone (toggle) | Switch UI — bez ikony |

### Stany puste / karty

| Stan | Emoji | Plik |
|------|-------|------|
| Wymaga logowania | 🔐 | `GroupMapPage`, `MapsGroupsPage` |
| Brak grup | 🗺️ | `MapsGroupsPage` |
| Ikona karty grupy | 🗺️ | `MapsGroupsPage` |

Topbar modułu: `✕` w `MapsPage.tsx`.

---

## 6. Travel Buddies (`modules/travel-buddies/`)

### Stany puste

| Stan | Emoji | Plik |
|------|-------|------|
| Wymaga logowania | 🔐 | `GroupsPage` |
| Brak grup | ✈️ | `GroupsPage` |

### Nawigacja

| Akcja | Obecna forma |
|-------|--------------|
| Wróć do listy grup | ← Wróć |
| Zamknij moduł | ✕ |
| Nowa grupa | + Nowa grupa (tekst) |

### Zakładki grupy (`GroupDetailPage.tsx`) — tylko tekst

| Zakładka | ID | Ikona dziś |
|----------|-----|------------|
| Członkowie | `members` | brak |
| Ankiety | `polls` | brak |
| Zadania | `tasks` | brak |
| Notatki | `notes` | brak |
| Pakowanie | `packing` | brak |

### Akcje w zakładkach

| Akcja | Obecna forma |
|-------|--------------|
| Zadanie ukończone | `✓` w checkboxie |
| Usuń zadanie / pozycję / notatkę | ✕ |
| Ilość w pakowaniu | `×{n}` (typografia) |
| Reakcje na notatki | 👍 ❤️ 😄 🔥 😮 |
| Upload załącznika | Przycisk tekstowy (`tb-att-upload-btn`) |
| Usuń załącznik | ✕ |
| Ankieta zamknięta | Badge tekstowy „Zamknięta” |

### Chat (`ChatPage.tsx`)

Plik istnieje, **nie jest podpięty do routingu** w `TravelBuddiesPage.tsx`.

| Element | Obecna forma |
|---------|--------------|
| Reakcje | 👍 ❤️ 😄 😢 😮 |
| Wyślij | Tekst „Send” |

---

## 7. Journal (planowany)

Moduł zdefiniowany w `journal/index.ts` — **brak UI**.

Z opisu modułu wynikają przyszłe potrzeby ikonograficzne:

- wpis dziennika,
- widoczność publiczna / prywatna,
- komentarze i reakcje,
- zapisane dzienniki,
- media (zdjęcia) w wpisach.

---

## 8. Jedyny istniejący SVG

Plik: `frontend/src/modules/maps/ui/maps.css` — klasa `.maps-icon-trash`.

Inline SVG (ścieżka kosza) używana jako CSS `mask-image` przy akcjach usuwania w Maps. Wzorzec do rozszerzenia na resztę aplikacji.

---

## Luki — miejsca bez ikon, które ich potrzebują

| Obszar | Co dodać |
|--------|----------|
| Strona główna App | Ikona per moduł (5 modułów) |
| Account | Ikony na kartach home + theme toggle |
| Buddies — zakładki | Ikona per zakładka (5) |
| Guide editor | Ikona per typ bloku (5) |
| Mail / Calendar | Sync, connect, disconnect |
| Journal (przyszłość) | Pełny zestaw od zera |

Szczegóły implementacji: [specification.md](./specification.md).
