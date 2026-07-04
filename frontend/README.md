# Keepr — frontend

A Google Keep-style notes UI for the todo-microservices backend. Plain HTML/CSS/JS — no framework, no build step, no npm install required for the frontend itself.

## Design

- Masonry grid of note cards (CSS columns), an expanding composer at the top, sidebar with **Notes** / **Completed**, live search, and 8 pastel note colors.
- Each note card has a "dog-ear" folded corner — a small signature touch evoking a physical kept note rather than a flat card.
- Typefaces: Poppins for headings/buttons, Inter for body text, loaded from Google Fonts.
- Fully keyboard accessible, visible focus states, respects `prefers-reduced-motion`.

## How it maps to the backend

- Each note **is** a task from task-service (`title`, `description`, `status`).
- The checkbox calls `PATCH /tasks/:id/complete`. There's no "uncomplete" endpoint on the backend, so once a note is checked it moves to the Completed tab and stays there — clicking it again just shows a hint instead of erroring.
- **Note color is local-only**: the backend schema has no color column, so colors are stored in the browser's `localStorage`, keyed per logged-in user. Colors won't sync across devices or browsers — that would require adding a `color` column to the tasks table.
- Login/register call `/auth/register` and `/auth/login` through the gateway; the returned JWT is stored in `localStorage` and sent as `Authorization: Bearer <token>` on every task request.

## Running it

The frontend is fully static, so any static file server works. From the `frontend/` folder:

```bash
# Option 1: Node's npx (no install needed)
npx serve . -l 8080

# Option 2: Python (if installed)
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

**The backend must be running first** — specifically the API Gateway on port 3000 (which in turn proxies to auth-service and task-service). See the root `README.md` for backend setup. `frontend/js/config.js` points at `http://localhost:3000` by default; change `API_BASE_URL` there if your gateway runs elsewhere.

Because the frontend's origin (e.g. `:8080`) differs from the gateway's (`:3000`), the gateway has CORS enabled (`cors()` middleware) — already wired up in `api-gateway/server.js`.

## File structure

```
frontend/
├── index.html       # auth screen + app shell + note card template
├── css/style.css     # all styling, design tokens at the top
├── js/config.js      # API_BASE_URL
├── js/api.js          # fetch wrapper for the gateway's endpoints
└── js/app.js           # state, rendering, event wiring
```
