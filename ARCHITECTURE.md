# Application Architecture Reference (V3.0.0)

This document serves as a comprehensive technical breakdown of the Personal Dashboard application. It is designed to be your absolute baseline reference guide whenever you return to this code in the future.

---

## 🏗️ 1. High-Level System Architecture

The dashboard is a **Full-Stack Dockerized Application**. It isolates the frontend and backend into two separate containers communicating internally, governed by Docker Compose.

- **Frontend Container (`dashboard_frontend`)**: Runs a lightweight **NGINX (Alpine)** web server. It strictly serves static files (`index.html`, CSS, JS) on Port 4446 and acts as a **Reverse Proxy**, seamlessly forwarding any network traffic containing `/api/` directly to the hidden backend container.
- **Backend Container (`dashboard_backend`)**: Runs a **Node.js (TypeScript)** server on Port 3000 (hidden from the public internet). It powers the entire REST API, intercepts proxied requests, processes complex integrations (Calendars/RSS), and mounts a persistent SQLite database.

---

## 🎨 2. Frontend Structure (Vanilla JavaScript)

The frontend explicitly avoids bloated bundlers (like Webpack or React) in favor of blazing-fast, strictly-modular plain JavaScript and Tailwind CSS utility classes. 

### Visual Paradigm: Glassmorphism
The UI aesthetic relies on **Glassmorphism**, accomplished strictly via three Tailwind classes:
1. `bg-black/40` or `bg-white/60` (Translucent background)
2. `backdrop-blur-md` (Blurs whatever is behind the element)
3. `border border-white/20` (Provides a simulated glossy glass rim)

### Modular Javascript Map (`/frontend/js/`)
We broke the monolithic `app.js` into strictly divided logic paths, sequentially loaded via `defer` tags in `index.html`:
*   `state.js`: Stores global variables (e.g. `appState`, token caching, generic color grids).
*   `api.js`: The central network handler containing `apiFetch()`. This function automatically intercepts API calls, injects your JWT Authentication Bearer token, automatically strings JSON payloads, and gracefully logs you out if tokens expire. 
*   `auth.js`: Handles strictly the Login UI, Registration UI, and Profile Settings modals.
*   `ui.js`: Massive powerhouse file handling pure DOM rendering. This builds the dynamic URL Tiles, configures the `SortableJS` grid drag-and-drop, and actively repaints the layout upon syncs.
*   `app.js`: The primary kickoff script. Binds the generic top widgets (To-Do, Weather, Calendar, RSS) and formally executes `showDashboard()` to boot the engine.

---

## ⚙️ 3. Backend Structure (TypeScript)

The Node.js backend was recently upgraded to enforce **Strict TypeScript** (`.ts`) compilation. Before Docker boots it, `tsc` compiles the TS payload into raw Javascript inside a `/dist` directory.

### Key Endpoint Routings (`/backend/routes/`)
*   `auth.ts`: Signs and verifies secure JWT payload identities. Maps hashed bcrypt passwords.
*   `tiles.ts` & `groups.ts`: Bound to the frontend drag-and-drop grid. Saves the explicit array ordering and URL payloads.
*   `backgrounds.ts`: Safely captures massive Max-50MB Base64 image payloads and writes them natively as files to the hard drive, logging their string paths into SQLite.
*   `rss.ts`: Bypasses your browser's CORS locks by proxying generic XML News feeds directly on the server, running a cyclic round-robin sorting algorithm before sending JSON to the browser.
*   `calendar.ts`: Quietly parses native Google `.ics` links, synchronizes dates chronologically, and powers the exact coordinate calculations to drop colored event markers into the UI grid.

---

## 💾 4. Database Schema (SQLite)

The entire application relies on a single `.db` file strictly housed in your host `./data` Linux directory mapped to `/app/data/dashboard.db` over the Docker filesystem. 

**Table: `users`**
*   **Authentication**: `username` & `password` (hashed).
*   **Preferences**: `activeBackgroundId`, `activeBackgroundColor`, `todos` (stringified object array).
*   **Secrets**: `workCalendarUrl` and `personalCalendarUrl`.

**Table: `tiles`**
*   **Configuration**: `name`, `url`, `icon` (FontAwesome classes or Base64 Image string), `type`, `borderColor`.
*   **Relational**: `userId`, `groupId` (Foreign Keys indicating ownership).
*   **Sorting**: `sortOrder` (Integer mapping index location).

---

## 🚀 5. Deployment Protocol

Because the application requires compiling TypeScript and securely mapping NGINX rules, deployment must be fully orchestrated rather than just pushing files generically.

1. **`deploy.bat`**: A specialized Windows script that instantly bundles the exact necessary frontend and backend source files into a `.tar` payload.
2. **SCP & Run**: The terminal natively pushes the `.tar` over SSH directly to your Ubuntu `my-dashboard` root folder, unzips it, and seamlessly fires the command:
    ```bash
    docker compose up -d --build
    ```
This safely overwrites the running containers with zero-downtime cache layers!
