# AsenaJS Example — Todo API

A production-shaped **Todo + Chat application** built with [AsenaJS](https://asena.sh) — the decorator-based
IoC web framework for the [Bun](https://bun.sh) runtime. Think "NestJS/Spring Boot style", but native
to Bun: TypeScript decorators for wiring, field-based dependency injection, and an HTTP layer that
binds directly to `Bun.serve()` through the Hono adapter.

This repo is a **reference application**: every feature is implemented the way the framework
recommends, so you can copy patterns directly into your own project — session authentication with
`@asenajs/asena-auth` (Bearer token or HttpOnly cookie, sessions stored in PostgreSQL, role-based
`@Roles` guards), Zod
validation and route context contracts, OpenAPI docs generated from those same schemas, PostgreSQL
access through Drizzle with declarative transactions, file uploads, static serving, real-time chat
over WebSockets with room-based pub/sub, and a three-level test suite.

> Originally written against AsenaJS `0.1.x`, now on `@asenajs/asena` `0.12.3` +
> `@asenajs/hono-adapter` `5.0.3` + `@asenajs/asena-auth` `1.0`. Short migration notes are at the
> [end](#migration-notes).

## What the code looks like

Controllers stay thin, services own the business logic, wiring is done with decorators (no
configuration files, no manual DI registration), and access control is a mark on the class:

```ts
@Protected()                              // asena-auth's guard: 401 before anything else runs
@Controller('/todos')
export class TodoController {
  @Inject(TodoService)                    // field injection — never constructors
  private todoService!: TodoService;

  @Put('/:id')
  public async update(context: UpdateTodoContext) {   // route context contract
    const { params, body } = context.input;           // validated & typed: { id: number }, { title?: string, … }
    const user = currentUser(context);                // the session's user
    return context.send(await this.todoService.updateTodo(params.id, user.id, body), 200);
  }
}
```

Route context contracts are plain classes built with the adapter's `Context.define()` — the handler
takes the contract as its first parameter and reads already-coerced values from `context.input`:

```ts
export class ListMessagesContext extends Context.define({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({ limit: z.coerce.number().int().positive().optional() }),
}) {}
```

Routes that document their responses keep a validator class — the same Zod schema that guards the
request also feeds the **OpenAPI spec**, so docs and validation can never drift apart:

```ts
@Middleware({ validator: true })
export class SignupValidator extends ValidationService {
  public form() {
    return z.object({
      userName: z.string().min(3).max(50),
      password: z.string().min(8),
      file: z.file().refine(/* max 5MB, jpg/png/webp */),  // multipart upload in the spec
    });
  }
}
```

Authentication is one provider class. Its sessions are opaque tokens (only their SHA-256 is stored),
so they can be listed and revoked server-side — and they live in PostgreSQL through a custom store:

```ts
@Auth({ sessionTtl: env.sessionTtl, hashing: { algorithm: 'argon2id' }, csrf: { trustedOrigins } })
export class AppAuth extends AsenaAuthService<AppUser> {
  @Inject('SessionRepository')
  private sessionRepository!: SessionRepository;

  public override async onStart(): Promise<void> {
    this.setStore(new DrizzleSessionStore(this.sessionRepository));  // before super.onStart()
    await super.onStart();
  }
}
```

Role checks are a mark too — `@Roles(...)` implies `@Protected()`: no session is a `401`, a
session without the role a `403`, both before validation or the handler run:

```ts
@Roles('admin')
@Controller('/admin')
export class AdminController { /* GET /admin/users, PUT /admin/users/:id/role */ }
```

Cross-cutting database work is declarative — `@Transaction()` propagates through
`AsyncLocalStorage`, so every repository call inside `signup()` joins one atomic transaction
(user + welcome todo) without passing a `tx` handle around:

```ts
@Transaction()
public async signup(dto: SignupDto): Promise<PublicUser> { /* ... */ }
```

And configuration is injected the same way as collaborators — `@Value` reads `process.env` when the
container builds the component:

```ts
@Value('CHAT_MAX_PAGE_SIZE', { parse: Number, default: 100 })
private maxPageSize!: number;
```

## Architecture

```
            HTTP request
                 │
   ┌─────────────▼──────────────┐
   │  Request pipeline           │  GlobalCors → auth guard (@Protected) → AuthRateLimiter → validator / contract
   └─────────────┬──────────────┘
   ┌─────────────▼──────────────┐
   │  Controller (thin)         │  parse request · call service · shape response
   ├────────────────────────────┤
   │  Service (business logic)  │  invariants live here: ownership, duplicates, session rules
   ├────────────────────────────┤
   │  Repository (data access)  │  one per domain, injected only into its own service
   ├────────────────────────────┤
   │  Drizzle ORM → PostgreSQL  │  @Database pool · @Transaction via AsyncLocalStorage
   └────────────────────────────┘
```

The pipeline order is fixed on both adapters: global middlewares → controller middlewares → **auth
guard** → route middlewares → validation → handler. An anonymous request to a protected route is a
`401` even when its body is invalid — it never reaches validation or the handler.

Layering rules enforced throughout:

- Controllers never touch repositories or business rules.
- A repository is injected **only** into its own domain service; cross-domain access goes through
  the owning service (e.g. `AuthService` calls `UserService`, never `UserRepository`). The
  `SessionRepository` belongs to the `AppAuth` provider.
- Validators and route contracts check request *shape*; services check *meaning*.

## Features

| Area | What is demonstrated | Where |
|---|---|---|
| Bootstrap | `AsenaServerFactory` + `createHonoAdapter` (tuple form) + `AsenaLogger`, package components via `imports` | `src/index.ts` |
| IoC | Field-based `@Inject`, `@Value` configuration injection, `@OnStart` lifecycle, layered architecture | everywhere |
| Validation | `Context.define()` route contracts with typed `context.input`, plus Zod validator classes (`json()`, `form()`, `param()`) where responses are documented | `src/validators/` |
| OpenAPI 3.1 | Spec generated **from the validators and route contracts**, Swagger UI, `@Hidden` routes, response schemas | `src/openapi/AppOpenApi.ts` |
| Auth | `@asenajs/asena-auth`: `@Auth` provider, `@Protected` routes, Bearer **or** HttpOnly cookie, CSRF check for cookies, Argon2id hashing, logout / session list / revoke / logout-all | `src/auth/`, `src/controllers/AuthController.ts` |
| Roles | `@Roles('admin')` guard (401 vs 403), roles in the session snapshot, role changes revoke the user's sessions in one transaction, first admin via `bun run user:admin` | `src/controllers/AdminController.ts`, `scripts/make-admin.ts` |
| Sessions | Custom `AuthSessionStore` over Drizzle — sessions survive restarts and are shared across instances; deleting a user cascades to their sessions | `src/auth/DrizzleSessionStore.ts` |
| Middleware | Global/controller/route levels, adapter built-ins subclassed (CORS, proxy-aware rate limiter) | `src/middlewares/` |
| Database | `@Database` (bun-sql driver), `@Repository` + `BaseRepository`, migrations auto-applied on boot | `src/database/`, `src/repositories/` |
| Transactions | `@Transaction()` via `AsyncLocalStorage` — signup creates user + welcome todo atomically | `src/services/AuthService.ts` |
| File upload | Multipart signup with a profile image (`z.file()`), safe generated file names | `src/services/FileStorageService.ts` |
| Static files | `@StaticServe` serving `public/` under `/static` | `src/statics/PublicStaticServe.ts` |
| Errors | Central `onError`/`onNotFound`, `HttpException`, `isValidationError()` before `isHttpException()`, one JSON envelope (the guard's 401/403 included) | `src/config/AppConfig.ts` |
| WebSocket | Real-time chat: `AuthWebSocketMiddleware` on the namespace, room pub/sub, membership enforced by the service layer | `src/websockets/ChatWebSocket.ts` |
| Testing | `mockComponent` (unit), `createWebTest` + `TestAuthProvider` (web slice), `createTestApp` (e2e) — no DB needed | `tests/` |

## Requirements

- [Bun](https://bun.sh) >= 1.4
- PostgreSQL 14+ (any instance reachable on `DB_HOST`; a Docker one-liner is below)

## Quickstart

```bash
# 1. install dependencies
bun install

# 2. start PostgreSQL (or point .env at your own instance)
docker run -d --name asena-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=asena_example \
  -p 5432:5432 postgres:16

# 3. configure the app — every variable has a working local default
cp .env.example .env

# 4. run — pending Drizzle migrations (sessions table included) are applied on boot
bun run dev
```

The API is now at `http://localhost:3000`:

- Swagger UI: `http://localhost:3000/openapi/ui`
- OpenAPI spec: `http://localhost:3000/openapi`
- Health check: `http://localhost:3000/health`

### Try it

```bash
# sign up (multipart, with a profile image)
curl -F userName=jane -F firstName=Jane -F lastName=Doe -F age=30 \
     -F password=supersecret -F file=@avatar.png localhost:3000/auth/signup

# log in — API clients use the token as a Bearer header ...
TOKEN=$(curl -s -H 'content-type: application/json' \
  -d '{"userName":"jane","password":"supersecret"}' localhost:3000/auth/login | jq -r .token)

curl -H "authorization: Bearer $TOKEN" localhost:3000/todos
curl -X POST -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Buy milk"}' localhost:3000/todos

# ... browsers get the same session as the HttpOnly asena_session cookie
curl -c jar.txt -H 'content-type: application/json' \
  -d '{"userName":"jane","password":"supersecret"}' localhost:3000/auth/login
curl -b jar.txt localhost:3000/auth/me

# signed-in devices, and ending sessions
curl -H "authorization: Bearer $TOKEN" localhost:3000/auth/sessions
curl -X POST -H "authorization: Bearer $TOKEN" localhost:3000/auth/logout
curl -H "authorization: Bearer $TOKEN" localhost:3000/auth/me     # → 401, revoked server-side

# make jane an admin (out of band — no HTTP route can promote its own caller), log in again
bun run user:admin jane
TOKEN=$(curl -s -H 'content-type: application/json' \
  -d '{"userName":"jane","password":"supersecret"}' localhost:3000/auth/login | jq -r .token)
curl -H "authorization: Bearer $TOKEN" localhost:3000/admin/users
```

## Project structure

```
src/
├─ index.ts                     # AsenaServerFactory + createHonoAdapter + imports: [...authComponents]
├─ env.ts                       # module-level config (port, DB, origins, session TTL, proxies)
├─ auth/
│  ├─ AppAuth.ts                # @Auth provider — sessions, hashing, cookie + CSRF options
│  ├─ DrizzleSessionStore.ts    # AuthSessionStore over SessionRepository (PostgreSQL)
│  └─ currentUser.ts            # the session user with its numeric database id
├─ config/
│  ├─ AppConfig.ts              # @Config: global CORS, onError / onNotFound error model
│  └─ AppDrizzle.ts             # @Drizzle post-processor enabling @Transaction
├─ database/
│  ├─ schemas/                  # Drizzle tables (users, todos, chat, sessions) + bun-sql jsonb column
│  ├─ MainDatabase.ts           # @Database (bun-sql) — pool managed by the framework
│  └─ MigrateService.ts         # applies ./drizzle migrations on @OnStart
├─ repositories/                # @Repository + BaseRepository, one per domain
├─ services/                    # business logic; services own the invariants
├─ middlewares/                 # GlobalCors, AuthRateLimiter (adapter built-ins, subclassed)
├─ validators/                  # Zod validators + Context.define() contracts — validate AND feed OpenAPI
├─ controllers/                 # thin HTTP layer only (AdminController: @Roles('admin'))
├─ statics/                     # @StaticServe for public/
├─ websockets/                  # @WebSocket namespaces (chat, public notifications)
└─ openapi/AppOpenApi.ts        # @OpenApi({ ui: true })
scripts/
└─ make-admin.ts                # bun run user:admin <userName> — bootstraps the first admin
```

## API overview

"Session" means either `Authorization: Bearer <token>` or the `asena_session` cookie set by
`/auth/login`. A Bearer header wins when both are present.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Multipart signup with a profile image (rate limited) |
| `POST` | `/auth/login` | — | Opens a session: token in the body + HttpOnly cookie (rate limited) |
| `GET` | `/auth/me` | Session | Current user (live data, not the session snapshot) |
| `POST` | `/auth/logout` | Session | Ends the current session and clears the cookie |
| `GET` | `/auth/sessions` | Session | The user's active sessions, the current one flagged |
| `DELETE` | `/auth/sessions/:id` | Session | Revokes one of the user's own sessions (others → 404) |
| `POST` | `/auth/logout-all` | Session | Ends every session of the user |
| `GET` | `/admin/users` | Session + `admin` role | Every user with their role (no password hashes) |
| `PUT` | `/admin/users/:id/role` | Session + `admin` role | `{ "role": "user" \| "admin" }`; ends all of that user's sessions; not on yourself (403) |
| `GET` | `/todos` | Session | List the user's todos |
| `POST` | `/todos` | Session | Create a todo |
| `GET` | `/todos/:id` | Session | Get one todo (ownership enforced → 404) |
| `PUT` | `/todos/:id` | Session | Partial update |
| `DELETE` | `/todos/:id` | Session | Delete |
| `GET` | `/static/*` | — | Static files (profile uploads) |
| `POST` | `/chat/rooms` | Session | Create a chat room (creator becomes owner + member) |
| `GET` | `/chat/rooms` | Session | List all rooms (content requires membership) |
| `GET` | `/chat/rooms/:id` | Session | Room detail (members only → 403) |
| `DELETE` | `/chat/rooms/:id` | Session | Delete a room, messages follow via cascade (owner only) |
| `POST` | `/chat/rooms/:id/join` | Session | Join a room (open, idempotent) |
| `POST` | `/chat/rooms/:id/leave` | Session | Leave a room (members; the owner must delete instead) |
| `GET` | `/chat/rooms/:id/messages` | Session | Room messages, newest first, `?limit=` (positive integer, capped at `CHAT_MAX_PAGE_SIZE`; non-numeric or ≤ 0 is `400`) (members only) |
| `POST` | `/chat/rooms/:id/messages` | Session | Send a message (members only) |
| `POST` | `/chat/messages/:id/read` | Session | Mark a message as read |
| `DELETE` | `/chat/messages/:id` | Session | Delete a message (sender only) |
| `WS` | `/chat-room` | Session (`bearer` subprotocol, header or cookie) | Real-time chat (see below) |
| `WS` | `/notifications` | — | Public notification channels demo |
| `GET` | `/openapi`, `/openapi/ui` | — | Generated spec + Swagger UI |
| `GET` | `/health` | — | Health check (hidden from the spec) |

Every response uses the same envelope: `{ success: true, ...data }` or
`{ success: false, message, errors? }`. Validation failures return a structured `400` with
per-field details, domain errors (`HttpException`) keep their status (401/403/404/409), the auth
guard's plain `401`/`403` are wrapped into the envelope (keeping `WWW-Authenticate: Bearer`), and
unmatched routes hit the custom `onNotFound` handler.

## Authentication

Auth is `@asenajs/asena-auth` with its native provider (`src/auth/AppAuth.ts`):

- **One session, two transports.** `/auth/login` returns the token in the body (for
  `Authorization: Bearer` clients) and writes it as the `asena_session` cookie (`HttpOnly`,
  `Secure`, `SameSite=Lax`) through `applySessionCookie()`. Chromium and Firefox treat
  `http://localhost` as a secure context and keep a `Secure` cookie there; elsewhere serve HTTPS.
- **Opaque, revocable tokens.** A token is 32 random bytes; only its SHA-256 is stored. Logout,
  "sign out this device" and "sign out everywhere" take effect on the very next request — a stateless
  JWT cannot do that. Sessions slide (extended once less than half of `SESSION_TTL` is left) up to
  a hard 30-day cap.
- **Sessions in PostgreSQL.** The default `MemoryAuthStore` is per process — every restart (and every
  `--hot` reload) would log everyone out. `DrizzleSessionStore` implements `AuthSessionStore` over
  the `sessions` table; `AppAuth` sets it in `onStart()` because the store needs an injected
  repository. `sessions.user_id` cascades, so deleting a user ends their sessions immediately.
- **Guards, not middleware.** `@Protected()` on a controller (or a method) only records metadata;
  the `AuthGuard` from `imports: [...authComponents]` in `src/index.ts` enforces it. Without that
  import every route would silently stay public — `asena doctor`'s `auth-enforcement` check catches it.
- **CSRF.** A cookie sent cross-site on a state-changing request counts as no session. The SPA
  origins from `ALLOWED_ORIGINS` (also the CORS allow-list) are trusted. Bearer tokens are exempt.
- **Untrusted ids.** `DELETE /auth/sessions/:id` checks ownership in `AuthService` first —
  `revokeSessionById()` would end any session it is given.
- **Roles.** `users.role` is `user` or `admin`; signup always creates a `user` (a `role` field in
  the form is stripped by the validator). Login copies it into the session snapshot as
  `roles: [role]`, which the default roles resolver reads for `@Roles(...)`: no session → `401`
  with `WWW-Authenticate`, a session without the role → `403` without it.
- **Snapshots and privilege changes.** A session keeps the roles it was created with. So
  `PUT /admin/users/:id/role` updates the role **and** revokes every session of that user in one
  `@Transaction` (`SessionRepository` joins it through `AsyncLocalStorage`) — a demoted admin is a
  `401` on the next request, not an admin until the session expires. A promotion through
  `bun run user:admin` applies from the next login.
- **Bootstrapping.** The role endpoint itself needs the admin role, so the first admin is made
  out of band with `bun run user:admin <userName>` (its own single DB connection, like
  `MigrateService`). Admins cannot change their own role, so the acting admin can't lock
  themselves out.

## WebSocket chat

The REST API above is mirrored by a real-time namespace at `/chat-room`. `@Protected` does not apply
to sockets, so the namespace lists asena-auth's `AuthWebSocketMiddleware`: it resolves the same
session as the REST API and answers `401` before the upgrade when there is none. Browsers cannot set
headers on a WebSocket, so they send the token as a subprotocol pair:

```js
const socket = new WebSocket('wss://api.example.com/chat-room', ['bearer', token]);
```

Server-side clients may send `Authorization: Bearer` instead; a same-origin page may rely on the
cookie. Every membership rule the REST layer enforces is enforced here too: `join` registers the
membership, and `message` from a non-member is rejected by `ChatService` and relayed back as an
`error` event.

Client → server messages:

```jsonc
{ "type": "join",    "roomId": 1 }                      // subscribe + become a member
{ "type": "leave",   "roomId": 1 }                      // unsubscribe + drop membership
{ "type": "message", "roomId": 1, "content": "hi" }     // persisted, then broadcast
{ "type": "typing",  "roomId": 1 }                      // ephemeral, members only
```

Server → client events: `connected`, `joined`, `left`, `message` (with `messageId` and `timestamp`),
`typing`, `error`. Try it with two terminals:

```bash
TOKEN=<token from /auth/login>
wscat -c ws://localhost:3000/chat-room -H "authorization: Bearer $TOKEN"
> {"type":"join","roomId":1}
> {"type":"message","roomId":1,"content":"hello"}
```

A second, unauthenticated namespace `/notifications` demonstrates the public side of the same API:
`{"type":"subscribe","channel":"general"}` / `unsubscribe` / `ping`.

## Testing

The suite runs on Bun's test runner and needs **no PostgreSQL** — the e2e harness replaces the
Drizzle repositories with in-memory doubles via `overrides`.

| Level | Utility | Boots | Files |
|---|---|---|---|
| Unit | `mockComponent` | Nothing — dependencies auto-mocked | `tests/unit/` |
| Web slice | `createWebTest` + `TestAuthProvider` | Real controllers, auth guard, validators, route contracts, middleware | `tests/web/` |
| Full app | `createTestApp` | Whole IoC container + real HTTP server + real asena-auth stack | `tests/e2e/` |

```bash
bun test          # 109 tests across 10 files
```

Notable details worth copying into your own project:

- web tests authenticate with `@TestAuth` from `@asenajs/asena-auth/testing`
  (`tests/support/testAuth.ts`): an `x-test-user` header names the session user (`joe` holds the
  `user` role, `ada` the `admin` role) — no login, no store — while the real guard still answers
  `401` without a header and `403` without the role. `createWebTest` has no `imports`, so
  `authComponents` go into `components`,
- an auto-mocked provider has no getters, so the `AuthController` slice passes a small `AppAuth`
  stub (`cookieName`, `cookieOptions`, `logout`) through `overrides` and asserts the `Set-Cookie`,
- unit tests get the provider auto-mocked too (`mocks.auth.createSession` …), configure explicit
  doubles for name-injected repositories, and pin `@Value` fields the same way
  (`overrides: { maxPageSize: 10 }`),
- the e2e harness lists only the roots — `createTestApp` follows every `@Inject(Class)` (the
  `AppAuth` provider included); package components come in through `imports: [...authComponents]`
  exactly as in `src/index.ts`,
- the e2e suite runs the real `AppAuth` + `DrizzleSessionStore` over a repository double and covers
  the whole session lifecycle: only the token hash is stored, cookie login, the CSRF check, session
  listing, revoking another device, the `404` for someone else's session, logout and logout-all,
  plus the WebSocket handshake with and without the `bearer` subprotocol token,
- the roles suite shows the snapshot semantics end to end: a client-sent `role` is ignored at
  signup, a promoted user's old session stays `403` until re-login, and a role change turns the
  target's existing sessions into `401`s,
- the e2e test boots the real OpenAPI post-processor and asserts `@Hidden` routes stay out of the spec,
- the chat e2e flow covers the membership lifecycle end to end: non-member `403`s, idempotent join,
  ownership rules and cascade deletion.

## Configuration

All configuration comes from `process.env` (Bun loads `.env` automatically) — see `.env.example`.
Values needed before the container exists (decorator and middleware-constructor options) live in
`src/env.ts`; component configuration is injected with `@Value`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Browser origins allowed to call the API with credentials — the CORS allow-list **and** the trusted origins of the session cookie's CSRF check |
| `SESSION_TTL` | `43200` (12 h) | Session lifetime in seconds (sliding; hard cap 30 days) |
| `CHAT_MAX_PAGE_SIZE` | `100` | Upper bound for `?limit=` on room messages, injected into `ChatService` with `@Value` |
| `TRUSTED_PROXIES` | empty | Comma-separated reverse-proxy addresses. The auth rate limiter keys clients by peer address and only believes `X-Forwarded-For` from these — set it when running behind a proxy, or every client shares one bucket |
| `DB_HOST` / `DB_PORT` | `localhost` / `5432` | PostgreSQL address |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | `asena_example` / `postgres` / `postgres` | Credentials |

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Start with hot reload (`bun run --hot`) |
| `bun run start` | Start without hot reload |
| `bun test` | Run the whole test suite |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run lint` | ESLint (flat config) |
| `bun run build` | Production bundle to `dist/` via the Asena CLI (`asena-config.ts`) |
| `bun run db:generate` | Generate SQL migrations from the Drizzle schemas |
| `bun run user:admin <userName>` | Give an existing user the `admin` role (bootstraps the first admin) |

## Production

```bash
bun run build        # bundle to dist/index.asena.js
ALLOWED_ORIGINS=https://app.example.com bun dist/index.asena.js
```

- Serve over HTTPS — the session cookie is `Secure`.
- Set `ALLOWED_ORIGINS` to the public `https://` origins of your frontends. Behind a TLS-terminating
  proxy the app sees `http://` request URLs; browsers that send `Sec-Fetch-Site` pass on that
  alone, the rest are matched against this list (`X-Forwarded-*` headers are not read).
- Set `TRUSTED_PROXIES` when the app runs behind a reverse proxy (see [Configuration](#configuration)).
- Sessions are in PostgreSQL, so any number of instances can run side by side.
- Run `bunx asena doctor` in CI — it catches duplicate core copies, missing decorator flags, unsafe
  build settings, `@Protected` marks without a guard and browser-rejected cookie options.

## Migration notes

### 0.12.1 → asena-auth 1.0 (core 0.12.3)

- **Packages**: `@asenajs/asena` `0.12.3`, `hono-adapter` `5.0.3`, `asena-cli` `0.12`, new
  `@asenajs/asena-auth` `1.0`. CLI 0.12 no longer depends on core, so the `overrides` entry that
  pinned the CLI's own core copy is gone — `asena doctor` still reports a single core.
- **Auth**: hand-written JWT (`hono/jwt`, `AuthMiddleware`, `JWT_SECRET`) → the `AppAuth` native
  provider. `@Protected()` replaces `middlewares: [AuthMiddleware]`; handlers read the user with
  `currentUser(context)` (core's `requireAuthSession`) instead of `context.getValue('user')`, so the
  `AsenaVariables` augmentation is gone. Tokens are opaque and revocable; new logout, session list,
  revoke and logout-all endpoints. `JWT_SECRET` is no longer needed.
- **Passwords**: hashed and verified through the provider (`hashing: { algorithm: 'argon2id' }`);
  existing Argon2id hashes keep verifying unchanged.
- **Sessions table**: migration `0002_auth_sessions` adds `sessions` (token hash, user FK with
  cascade, jsonb user snapshot). Drizzle's built-in `jsonb()` double-encodes on the bun-sql driver,
  so the column uses a pass-through `jsonb` type (`src/database/schemas/columns.ts`).
- **WebSocket**: `WSAuthMiddleware` + `?token=` (tokens in URLs end up in access logs) →
  `AuthWebSocketMiddleware` with the `bearer` subprotocol, a header or the cookie.
- **Rate limiting**: `AuthRateLimiter` moved from the whole `/auth` controller to the credential
  routes (`signup`, `login`) — session management calls no longer spend the brute-force budget.
- **CORS**: the origin list moved to `ALLOWED_ORIGINS`, shared with the cookie's CSRF check.
- **Errors**: `onError` wraps plain-text `HttpException`s (the guard's `401`/`403`) into the JSON
  envelope and keeps their headers.
- **Roles**: migration `0003_user_roles` adds `users.role` (`user` default). `@Roles('admin')`
  guards the new `/admin` controller; role changes revoke the target's sessions; the first admin
  comes from `bun run user:admin`.
- **Tests**: web slices authenticate with `TestAuthProvider`; e2e imports `authComponents` and
  overrides `SessionRepository`. `.env.test` now pins `ALLOWED_ORIGINS`, `SESSION_TTL` and
  `CHAT_MAX_PAGE_SIZE`, so a local `.env` cannot change test outcomes.

### 0.10 → 0.12

- **Packages**: `@asenajs/asena` `0.12.1`, `hono-adapter` `5.x`, `asena-drizzle` `4.x`,
  `asena-logger` `3.x`, `asena-openapi` `3.x`, `asena-cli` `0.11`; Bun `>= 1.4`. An `overrides`
  entry in `package.json` pinned the CLI's own `@asenajs/asena` dependency to the app's copy so
  only one core was installed (`asena doctor` checks this).
- **Build**: `asena-config.ts` keeps identifier minification off — component names are read at
  runtime and do not survive it.
- **Validation**: `id`-only validator classes became `Context.define()` route contracts; the
  multipart signup reads its validated output with `getParseBody()` instead of `req.valid('form')`.
- **Configuration**: `JWT_SECRET` moved from an `env.ts` fallback to a required `@Value` field.
- **Rate limiting**: the adapter's limiter now trusts only the peer address; `TRUSTED_PROXIES`
  feeds its new `trustProxy` option.
- **Tests**: `createTestApp` expands `@Inject` closures, so the e2e component list shrank to roots.

### 0.1.x → 0.10

- **Bootstrap**: `new AsenaServer()` builder → `AsenaServerFactory.create()` with the standalone
  `@asenajs/hono-adapter` package (`createHonoAdapter` returns an `[adapter, logger]` tuple).
- **Middleware**: `implements MiddlewareService` + hono's `Next`/`HTTPException` → extend the
  adapter's `MiddlewareService`, throw the shared `HttpException`, match errors with
  `isHttpException()` / `isValidationError()` guards instead of `instanceof`.
- **Validation**: `@hono/zod-validator` wrappers → Asena `ValidationService` with plain Zod schemas.
- **Database**: hand-rolled `DatabaseService`/`Migrate` with a raw `postgres` client →
  `@asenajs/asena-drizzle` (`@Database`, `@Repository`, `BaseRepository`, `@Transaction`), the
  Bun-native SQL driver, migrations applied by a `@OnStart` service.
- **Security**: plain-text passwords with a `// TODO: hash password` → Argon2id via `Bun.password`,
  cookie-based JWT → `Authorization: Bearer`, hardcoded secrets → environment variables.
- **Docs**: none → OpenAPI 3.1 generated from the validators with Swagger UI.
- **Chat**: the legacy WebSocket chat (pre-0.10 imports, UUID keys without foreign keys, cookie
  auth, no membership model) was rebuilt on the current stack — serial keys with cascade FKs, a
  `chat_room_members` membership table, `?token=` WS handshake, and the same layered rules as the
  rest of the app.
- **Testing**: none → a test suite across unit / web-slice / e2e levels.
- **Tooling**: ESLint flat config, `asena-config.ts` for builds, Drizzle migrations committed
  under `drizzle/`, folder layout matching the CLI conventions (`src/controllers/`, `src/services/`, …).
