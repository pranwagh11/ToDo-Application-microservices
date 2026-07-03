# Todo Microservices

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

Open four terminals (or run sequentially in the background) and start each service:

```bash
# Terminal 1
cd auth-service && npm start

# Terminal 2
cd task-service && npm start

# Terminal 3
cd notification-service && npm start

# Terminal 4
cd api-gateway && npm start
```

Each prints which port it's listening on. Hit `http://localhost:3000/health` to confirm the gateway is up, and `http://localhost:<port>/health` on each service individually.

## Email notifications

`notification-service/.env` is preset for Gmail SMTP. If using Gmail, you'll need an [App Password](https://myaccount.google.com/apppassword) (not your normal password) since Gmail blocks plain password SMTP auth. Swap `SMTP_HOST`/`SMTP_PORT` for any other provider (Mailtrap, SendGrid SMTP, etc.) if preferred.

Notifications are fired by task-service as best-effort, non-blocking calls — if notification-service is down or misconfigured, task creation/completion still succeeds; the error is just logged to the console.

## API Reference (via gateway on :3000)

### Auth
| Method | Endpoint | Auth required | Body |
|---|---|---|---|
| POST | `/auth/register` | No | `{ name, email, password }` |
| POST | `/auth/login` | No | `{ email, password }` |
| GET | `/auth/profile` | Yes | — |

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

## Notes on design decisions

- **No Docker / no logger**: services run directly with `node server.js`, configured purely through `.env` files, per current project scope.
- **Separate databases**: auth_db and task_db are isolated, so task-service never joins against the users table — it trusts the `user_id`/`email` embedded in the verified JWT instead.
- **Notification trigger**: task-service calls notification-service directly over HTTP (synchronous, fire-and-forget) when a task is created or completed. This is simple but couples the two services; a message queue (RabbitMQ/Redis) would be a natural next step if reliability or retry logic becomes important.

## Frontend

A Google Keep-style notes UI lives in `frontend/` — plain HTML/CSS/JS, no build step, no framework. See `frontend/README.md` for how to run it.

