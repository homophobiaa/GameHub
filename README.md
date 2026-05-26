# SoftUni GameHub

A polished React/Vite/TypeScript/TailwindCSS launcher that showcases every student-made game built for the SoftUni class event.

## Development

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Build

```bash
npm run build
npm run preview
```

## Editing games

All game data lives in [src/data/games.json](src/data/games.json). Add/edit entries there — the UI is purely data-driven.

Each entry shape:

```jsonc
{
  "id": "unique-id",
  "name": "Game title",
  "creator": "Author name",
  "creatorGithub": "github-username",   // empty string = "GitHub coming soon"
  "description": "Short event-ready description.",
  "screenshot": "/screenshots/your-game.png", // missing file = animated fallback card
  "status": "In development",            // any string; known: Playable, Prototype, Coming soon, Completed
  "tags": ["Student Project", "Game"],
  "branch": "Branch-Name",
  "playUrl": "#"
}
```

## Screenshots

Drop PNGs into `public/screenshots/<slug>-game.png`. If a screenshot is missing the card automatically renders a beautiful animated fallback — no broken images.

## Stack

- React 18 + TypeScript
- Vite 5
- TailwindCSS 3
- Framer Motion
- lucide-react icons

## Maintainer

Maintained and led by **Deyan** — [@deo08mine](https://github.com/deo08mine).
