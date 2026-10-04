# Sports club website

Java 21 + Spring Boot 3 (REST, JWT, JPA) · React (Vite) · MariaDB/MySQL

## Run everything at once (Docker)
`docker compose up --build` then open **http://localhost** (stop with Ctrl+C, data is kept in the `dbdata` volume).
Edit the `environment:` values in `docker-compose.yml` (admin login, JWT secret, mail — see below) before going live.

## Run manually (development)
1. Database:   `docker compose up -d db`   (MariaDB on :3306, db/user/password = `club`)
2. Backend:    `cd backend && mvn spring-boot:run`   (http://localhost:8080)
3. Frontend:   `cd frontend && npm install && npm run dev`   (http://localhost:5173, proxies /api to the backend)

First start creates the SuperAdmin: **username `admin`, admin@club.local / Admin123!**
Change it with env vars `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and set `JWT_SECRET` (32+ chars) in production.
DB settings: `DB_URL`, `DB_USER`, `DB_PASSWORD`. Tables are created automatically.

## What's where
- Public: front page, news, about us, sidebar with next matches / results / league table.
- Sign up: new members register with username/email/password/mobile phone/name/surname. Accounts start **pending**
  and can't log in until a SuperAdmin approves them.
- Members (once approved): upload one photo/PDF per month at "My subscription" (can replace until confirmed).
- SuperAdmin (/admin):
  - **Accounts** — approve or reject pending sign-ups. Rejecting requires typing a reason, which is emailed to the member.
  - **Subscriptions** — review documents per month and mark a member subscribed.
  - **News / Matches / League table** — manage content (add a score to move a match to results).
  - **Email templates** — edit the subject/body of the welcome, approved and rejected emails. Placeholders
    `{{name}}`, `{{surname}}`, `{{username}}`, `{{clubName}}` and (rejection only) `{{reason}}` are filled in automatically.
  - **Site settings** — club name, tagline, logo, banner image, about text, accent colour, contact, footer.
- All documents and images are stored in the database (as bytes).

## Email
Off by default (`MAIL_ENABLED=false`) so the app runs without any mail setup — actions that would send an email are
just logged instead. To turn it on, set:
- `MAIL_ENABLED=true`
- `MAIL_HOST`, `MAIL_PORT` (defaults to Gmail's `smtp.gmail.com:587`)
- `MAIL_USERNAME`, `MAIL_PASSWORD` — for Gmail, create an **App Password** (Google Account → Security → 2-Step
  Verification → App passwords), not your normal password
- `MAIL_FROM` — the "from" address shown to recipients

A failed email send is logged and never blocks sign-up/approval/rejection — the site keeps working even if SMTP is
misconfigured.

## Production
`npm run build` in frontend, then serve `dist/` with nginx (proxy `/api` to the backend), or copy it into
`backend/src/main/resources/static` (add a SPA fallback controller for client-side routes).
