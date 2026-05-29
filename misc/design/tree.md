# Proponowane drzewo podstron finalnej strony WanderPall

Poniżej propozycja drzewa finalnej strony WanderPall jako produktu dla użytkownika, nie jako prezentacji modułów projektu.

```text
/
├── /dashboard
├── /trips
│   ├── /trips/new
│   ├── /trips/:tripId
│   │   ├── /overview
│   │   ├── /itinerary
│   │   ├── /map
│   │   ├── /notes
│   │   ├── /packing
│   │   ├── /budget
│   │   ├── /calendar
│   │   ├── /mail
│   │   ├── /journal
│   │   └── /settings
├── /guides
│   ├── /guides
│   ├── /guides/new
│   └── /guides/:guideId
├── /groups
│   ├── /groups
│   ├── /groups/new
│   └── /groups/:groupId
│       ├── /overview
│       ├── /chat
│       ├── /polls
│       ├── /tasks
│       └── /members
├── /journal
│   ├── /journal
│   ├── /journal/new
│   └── /journal/:entryId
├── /tools
│   ├── /calculator
│   ├── /translator
│   └── /calendar
├── /account
│   ├── /profile
│   ├── /theme
│   ├── /security
│   └── /delete
├── /login
├── /register
└── /password-reset
```

## Główna zmiana

Zamiast kart `Module 1`, `Module 2`, `Module 3`, strona główna powinna prowadzić do realnych workflow użytkownika:

- `Dashboard` - najbliższy wyjazd, zadania, ostatnia aktywność, szybkie akcje.
- `Trips` - główny obiekt aplikacji. Wszystko, co dotyczy konkretnej podróży, powinno być pod `/trips/:tripId/...`.
- `Groups` - współpodróżnicy, czat, ankiety, członkowie.
- `Guides` - przewodniki niezależne od konkretnej podróży albo możliwe do przypięcia do tripa.
- `Journal` - wpisy z podróży, publiczne/prywatne dzienniki.
- `Tools` - kalkulator, tłumacz, kalendarz jako szybkie narzędzia.

## Docelowa główna nawigacja

```text
Dashboard | Trips | Groups | Guides | Journal | Tools | Account
```

Nazwy modułów technicznych powinny zniknąć z UI użytkownika. Można je zostawić wyłącznie w dokumentacji lub panelu developerskim.
