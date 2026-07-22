# Keepr (Todo) Microservices

A simple Node.js + Express + MySQL microservices project: API Gateway, Auth Service, Task Service, and Notification Service. No Docker — each service is run directly with Node, configured via its own `.env` file.

## Architecture

```
api-gateway (3000)  -->  auth-service (4000)
                    -->  task-service (5000)  -->  notification-service (6000)
                    -->  notification-service (6000)
```

The API Gateway is a pure reverse proxy (`http-proxy-middleware`). It forwards `/auth/*` to auth-service, `/tasks/*` to task-service, and `/notify/*` to notification-service. Each service independently verifies JWTs — the gateway does not parse the body or do auth itself.

## Prerequisites

- Node.js 18+
- MySQL running locally (or accessible) on port 3306
- Two databases created manually before first run:
  ```sql
  CREATE DATABASE auth_db;
  CREATE DATABASE task_db;
  ```
  Tables are created automatically on service startup.

## Setup

Install dependencies in each service:

```bash
cd api-gateway && npm install && cd ..
cd auth-service && npm install && cd ..
cd task-service && npm install && cd ..
cd notification-service && npm install && cd ..
```

## Important: shared JWT secret

`auth-service/.env` and `task-service/.env` both have a `JWT_SECRET` value. **These must be identical**, since auth-service issues the token and task-service verifies it independently — there's no token-introspection call between them. Generate one random string and paste it into both `.env` files.

## Running

There are two ways to run this project: **Docker Compose** (recommended, one command) or **manually** (four terminals, no Docker).

### Option A: Docker Compose

From this top-level folder (the one containing `docker-compose.yml`):

```bash
cp .env.example .env
# edit .env: set DB_PASSWORD and a real JWT_SECRET

cp backend-services/notification-service/env_example.txt backend-services/notification-service/.env
# edit that file with real SMTP credentials (or leave as-is if you don't need email)

docker compose up --build
```

This starts MySQL, all four backend services, and the frontend together, wired up on an internal Docker network. `mysql`'s data persists in a named volume across restarts, and `auth_db`/`task_db` are created automatically on first boot via `init-db.sql`.

Once it's up:
- Frontend: http://localhost:8080
- API Gateway: http://localhost:3000
- Individual services: http://localhost:4000, :5000, :6000

Stop everything with `docker compose down` (add `-v` to also wipe the MySQL volume).

### Option B: Manual (no Docker)

Open four terminals (or run sequentially in the background) and start each service:

```bash
# Terminal 1
cd backend-services/auth-service && npm start

# Terminal 2
cd backend-services/task-service && npm start

# Terminal 3
cd backend-services/notification-service && npm start

# Terminal 4
cd backend-services/api-gateway && npm start
```

Each prints which port it's listening on. Hit `http://localhost:3000/health` to confirm the gateway is up, and `http://localhost:<port>/health` on each service individually.

## Email notifications

`notification-service/.env` is preset for Gmail SMTP. If using Gmail, you'll need an [App Password](https://myaccount.google.com/apppassword) (not your normal password) since Gmail blocks plain password SMTP auth. Swap `SMTP_HOST`/`SMTP_PORT` for any other provider (Mailtrap, SendGrid SMTP, etc.) if preferred.

Notifications are fired by auth-service and task-service as best-effort, non-blocking calls — if notification-service is down or misconfigured, registration/login/task operations still succeed; the error is just logged to the console. Three kinds of emails are sent:

- **Task created** — plain-text confirmation
- **Task completed** — an HTML "task card" (title, description, completion time, and a link back to the app), built by `shared/utils.js`'s `renderTaskCompletedEmail`
- **Password reset** — an HTML email containing a 6-digit verification code, built by `renderPasswordResetEmail`

Both auth-service and task-service need `NOTIFICATION_SERVICE_URL` set (already in their `.env` files) to reach notification-service. task-service also uses `FRONTEND_URL` to build the "Open KeepNote" button in its completion email — this must be an address the user's **browser** can reach, not a Docker/Kubernetes-internal one.

## Forgot / reset password (OTP-based)

| Method | Endpoint | Body | Notes |
|---|---|---|---|
| POST | `/auth/forgot-password` | `{ email }` | Always returns a generic success message, whether or not the email exists (prevents account enumeration). If the email matches a user, emails a 6-digit code valid for `OTP_EXPIRES_MINUTES` (default 10). |
| POST | `/auth/reset-password` | `{ email, otp, newPassword }` | Verifies the code against the stored hash, then updates the password. Single-use — consumed on success. |

Implementation notes:
- No links or tokens in the URL — the user types the code directly into the app. This works better than a link when the email might be read on a different device than the one running the app.
- Only a **hash** of the OTP is stored (`password_resets` table); the raw 6-digit code exists only in the email and briefly in memory during verification.
- A new forgot-password request invalidates any earlier unused code for that user.
- Failed verification attempts are counted (`attempts` column); after 5 wrong tries the code is invalidated and the user must request a new one — otherwise a 6-digit code (1,000,000 possibilities) would be guessable by brute force within its expiry window.
- Hash comparison uses `crypto.timingSafeEqual` rather than `===`, so response timing can't leak partial matches.
- The frontend flow is two steps: enter email → enter code + new password. The email is held in memory in the page's JS between steps (not the URL), so refreshing the page mid-flow means starting over.

## API Reference (via gateway on :3000)

### Auth
| Method | Endpoint | Auth required | Body |
|---|---|---|---|
| POST | `/auth/register` | No | `{ name, email, password }` |
| POST | `/auth/login` | No | `{ email, password }` |
| GET | `/auth/profile` | Yes | — |
| POST | `/auth/forgot-password` | No | `{ email }` |
| POST | `/auth/reset-password` | No | `{ email, otp, newPassword }` |


### Tasks
All task routes require `Authorization: Bearer <token>`.

| Method | Endpoint | Body |
|---|---|---|
| GET | `/tasks` | — |
| POST | `/tasks` | `{ title, description }` |
| PUT | `/tasks/:id` | `{ title, description, status }` (any subset) |
| DELETE | `/tasks/:id` | — |
| PATCH | `/tasks/:id/complete` | — |

### Notifications
| Method | Endpoint | Body |
|---|---|---|
| POST | `/notify/email` | `{ to, subject, message }` |

## Example flow

```bash
# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Jane","email":"jane@example.com","password":"secret123"}'

# Login (returns a token)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","password":"secret123"}'

# Create a task (replace TOKEN)
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"title":"Buy groceries","description":"Milk, eggs, bread"}'
```

## Known limitations

- **No DB-connection retry at startup**: `auth-service` and `task-service` call `initDb()` once on boot and `process.exit(1)` if it fails (e.g. MySQL isn't ready yet). This is fine with `docker compose` (which restarts on failure) and fine in Kubernetes (a Deployment restarts crashed pods automatically), but expect a few crash-loop restarts in the first 30–60 seconds after a cold start, until MySQL itself is ready.

## Notes on design decisions

- **No logger**: services run directly with `node server.js`, configured purely through `.env` files. Docker Compose (see "Running" above) is available for convenience but isn't required — everything still works with plain `node`/`npm start` too.
- **Separate databases**: auth_db and task_db are isolated, so task-service never joins against the users table — it trusts the `user_id`/`email` embedded in the verified JWT instead.
- **Notification trigger**: task-service calls notification-service directly over HTTP (synchronous, fire-and-forget) when a task is created or completed. This is simple but couples the two services; a message queue (RabbitMQ/Redis) would be a natural next step if reliability or retry logic becomes important.

## Frontend

A Google Keep-style notes UI lives in `frontend_fixed/` — plain HTML/CSS/JS, no build step, no framework. See `frontend_fixed/README.md` for how to run it standalone, or use Docker Compose above to run it alongside everything else.

