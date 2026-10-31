# AsenaJS Example — Todo API

A production-shaped **Todo + Chat application** built with [AsenaJS](https://asena.sh) — the decorator-based
IoC web framework for the [Bun](https://bun.sh) runtime. Think "NestJS/Spring Boot style", but native
to Bun: TypeScript decorators for wiring, field-based dependency injection, and an HTTP layer that
binds directly to `Bun.serve()` through the Hono adapter.

This repo is a **reference application**: every feature is implemented the way the framework
recommends, so you can copy patterns directly into your own project — JWT authentication, Zod
validation, OpenAPI docs generated from those same validators, PostgreSQL access through Drizzle
with declarative transactions, file uploads, static serving, real-time chat over WebSockets with
room-based pub/sub, and a three-level test suite.

> Originally written against AsenaJS `0.1.x`, now on `@asenajs/asena` `0.12.x` +
> `@asenajs/hono-adapter` `5.x`. Short migration notes are at the [end](#migration-notes).

## What the code looks like

Controllers stay thin, services own the business logic, and wiring is done with decorators
(no configuration files, no manual DI registration):

```ts
@Controller('/todos')
export class TodoController {
  @Inject(TodoService)                    // field injection — never constructors
  private todoService!: TodoService;

  @Post({ path: '/', validator: CreateTodoValidator })   // Zod validation middleware
  public async create(context: Context) {
    const dto = await context.getBody<CreateTodoDto>();  // already validated & typed
    const todo = await this.todoService.createTodo(context.getValue<User>('user').id, dto);
    return context.send({ success: true, todo }, 201);
  }
}
```

The same Zod schema that guards the request also feeds the **OpenAPI spec**, so docs and validation
can never drift apart:

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

And cross-cutting database work is declarative — `@Transaction()` propagates through
`AsyncLocalStorage`, so every repository call inside `signup()` joins one atomic transaction
(user + welcome todo) without passing a `tx` handle around:

```ts
@Transaction()
public async signup(dto: SignupDto): Promise<PublicUser> { /* ... */ }
```

Routes that only need typed parameters use a **route context contract** instead of a validator
class — the handler takes the contract as its first parameter and reads already-coerced values
from `context.input`:

```ts
export class ListMessagesContext extends Context.define({
  params: z.object({ id: z.coerce.number().int().positive() }),
  query: z.object({ limit: z.coerce.number().int().positive().optional() }),
}) {}

@Get('/rooms/:id/messages')
public async getMessages(context: ListMessagesContext) {
  const { params, query } = context.input;          // { id: number }, { limit?: number }
  // ...
}
```

Configuration is injected the same way as collaborators — `@Value` reads `process.env` when the
container builds the component, and a required value that is missing stops the boot:

```ts
@Value('JWT_SECRET')          // no default → the server refuses to start without it
private jwtSecret!: string;
```

## Architecture

```
            HTTP request
                 │
   ┌─────────────▼──────────────┐
   │  Middleware chain           │  GlobalCors → AuthRateLimiter / AuthMiddleware → Validator / contract
   └─────────────┬──────────────┘
   ┌─────────────▼──────────────┐
   │  Controller (thin)         │  parse request · call service · shape response
   ├────────────────────────────┤
   │  Service (business logic)  │  invariants live here: ownership, duplicates, auth
   ├────────────────────────────┤
   │  Repository (data access)  │  one per domain, injected only into its own service
   ├────────────────────────────┤
   │  Drizzle ORM → PostgreSQL  │  @Database pool · @Transaction via AsyncLocalStorage
   └────────────────────────────┘
```

Layering rules enforced throughout:

- Controllers never touch repositories or business rules.
- A repository is injected **only** into its own domain service; cross-domain access goes through
  the owning service (e.g. `AuthService` calls `UserService`, never `UserRepository`).
- Validators and route contracts check request *shape*; services check *meaning*.

## Features

| Area | What is demonstrated | Where |
|---|---|---|
| Bootstrap | `AsenaServerFactory` + `createHonoAdapter` (tuple form) + `AsenaLogger` | `src/index.ts` |
| IoC | Field-based `@Inject`, `@Value` configuration injection, `@OnStart` lifecycle, layered architecture | everywhere |
| Validation | Zod 4 validator classes (`json()`, `form()`, `param()`) read via `getBody()` / `getParseBody()`, plus `Context.define()` route contracts with typed `context.input` | `src/validators/` |
| OpenAPI 3.1 | Spec generated **from the validators and route contracts**, Swagger UI, `@Hidden` routes, response schemas | `src/openapi/AppOpenApi.ts` |
| Auth | JWT bearer tokens (`hono/jwt`, 12h), Argon2id hashing (`Bun.password`), token → live-user lookup | `src/services/AuthService.ts` |
| Middleware | Global/controller/route levels, adapter built-ins subclassed (CORS, proxy-aware rate limiter) | `src/middlewares/` |
| Database | `@Database` (bun-sql driver), `@Repository` + `BaseRepository`, migrations auto-applied on boot | `src/database/`, `src/repositories/` |
| Transactions | `@Transaction()` via `AsyncLocalStorage` — signup creates user + welcome todo atomically | `src/services/AuthService.ts` |
| File upload | Multipart signup with optional profile image (`z.file()`), safe generated file names | `src/services/FileStorageService.ts` |
| Static files | `@StaticServe` serving `public/` under `/static` | `src/statics/PublicStaticServe.ts` |
| Errors | Central `onError`/`onNotFound`, `HttpException`, `isValidationError()` before `isHttpException()` | `src/config/AppConfig.ts` |
| WebSocket | Real-time chat: authenticated namespace, room pub/sub, membership enforced by the service layer | `src/websockets/ChatWebSocket.ts` |
| Testing | `mockComponent` (unit), `createWebTest` (web slice), `createTestApp` (e2e) — no DB needed | `tests/` |

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

# 3. configure the app — required: JWT_SECRET has no default, and without it the
#    boot stops with "@Value('JWT_SECRET') on AuthService.jwtSecret: environment
#    variable is not set and no default was given"
cp .env.example .env

# 4. run — pending Drizzle migrations are applied automatically on boot
bun run dev
```

The API is now at `http://localhost:3000`:

- Swagger UI: `http://localhost:3000/openapi/ui`
- OpenAPI spec: `http://localhost:3000/openapi`
- Health check: `http://localhost:3000/health`

### Try it

```bash
# sign up (multipart — profile image optional)
curl -F userName=jane -F firstName=Jane -F lastName=Doe -F age=30 \
     -F password=supersecret -F file=@avatar.png localhost:3000/auth/signup

# log in
TOKEN=$(curl -s -H 'content-type: application/json' \
  -d '{"userName":"jane","password":"supersecret"}' localhost:3000/auth/login | jq -r .token)

# work with todos
curl -H "authorization: Bearer $TOKEN" localhost:3000/todos
curl -X POST -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"title":"Buy milk"}' localhost:3000/todos
```

## Project structure

```
src/
├─ index.ts                     # AsenaServerFactory + createHonoAdapter bootstrap
├─ env.ts                       # module-level config (port, DB, proxies); the rest uses @Value
├─ config/
│  ├─ AppConfig.ts              # @Config: global CORS, onError / onNotFound error model
│  └─ AppDrizzle.ts             # @Drizzle post-processor enabling @Transaction
├─ database/
│  ├─ schemas/                  # Drizzle table definitions (users, todos)
│  ├─ MainDatabase.ts           # @Database (bun-sql) — pool managed by the framework
│  └─ MigrateService.ts         # applies ./drizzle migrations on @OnStart
├─ repositories/                # @Repository + BaseRepository, one per domain
├─ services/                    # business logic; services own the invariants
├─ middlewares/                 # AuthMiddleware, WSAuthMiddleware, GlobalCors, AuthRateLimiter
├─ validators/                  # Zod validators + Context.define() contracts — validate AND feed OpenAPI
├─ controllers/                 # thin HTTP layer only
├─ statics/                     # @StaticServe for public/
├─ websockets/                  # @WebSocket namespaces (chat, public notifications)
├─ openapi/AppOpenApi.ts        # @OpenApi({ ui: true })
└─ types/asena-variables.d.ts   # typed context.getValue('user')
```

## API overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | — | Multipart signup with optional profile image |
| `POST` | `/auth/login` | — | Returns a JWT bearer token (12h) |
| `GET` | `/auth/me` | Bearer | Current user |
| `GET` | `/todos` | Bearer | List the user's todos |
| `POST` | `/todos` | Bearer | Create a todo |
| `GET` | `/todos/:id` | Bearer | Get one todo (ownership enforced → 404) |
| `PUT` | `/todos/:id` | Bearer | Partial update |
| `DELETE` | `/todos/:id` | Bearer | Delete |
| `GET` | `/static/*` | — | Static files (profile uploads) |
| `POST` | `/chat/rooms` | Bearer | Create a chat room (creator becomes owner + member) |
| `GET` | `/chat/rooms` | Bearer | List all rooms (content requires membership) |
| `GET` | `/chat/rooms/:id` | Bearer | Room detail (members only → 403) |
| `DELETE` | `/chat/rooms/:id` | Bearer | Delete a room, messages follow via cascade (owner only) |
| `POST` | `/chat/rooms/:id/join` | Bearer | Join a room (open, idempotent) |
| `POST` | `/chat/rooms/:id/leave` | Bearer | Leave a room (members; the owner must delete instead) |
| `GET` | `/chat/rooms/:id/messages` | Bearer | Room messages, newest first, `?limit=` (positive integer, capped at 100; non-numeric or ≤ 0 is `400`) (members only) |
| `POST` | `/chat/rooms/:id/messages` | Bearer | Send a message (members only) |
| `POST` | `/chat/messages/:id/read` | Bearer | Mark a message as read |
| `DELETE` | `/chat/messages/:id` | Bearer | Delete a message (sender only) |
| `WS` | `/chat-room` | `?token=` | Real-time chat (see below) |
| `WS` | `/notifications` | — | Public notification channels demo |
| `GET` | `/openapi`, `/openapi/ui` | — | Generated spec + Swagger UI |
| `GET` | `/health` | — | Health check (hidden from the spec) |

Every response uses the same envelope: `{ success: true, ...data }` or
`{ success: false, message, errors? }`. Validation failures return a structured `400` with
per-field details, domain errors (`HttpException`) keep their status (401/403/404/409), and unmatched
routes hit the custom `onNotFound` handler.

## WebSocket chat

The REST API above is mirrored by a real-time namespace at `/chat-room`. The handshake is
authenticated by `WSAuthMiddleware` — browsers cannot set headers on an upgrade request, so the
bearer token travels as a query parameter (`wss://…/chat-room?token=<jwt>`). Every membership rule
the REST layer enforces is enforced here too: `join` registers the membership, and `message` from a
non-member is rejected by `ChatService` and relayed back as an `error` event.

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
TOKEN=<jwt from /auth/login>
wscat -c "ws://localhost:3000/chat-room?token=$TOKEN"
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
| Web slice | `createWebTest` | Real controllers, validators, route contracts, middleware | `tests/web/` |
| Full app | `createTestApp` | Whole IoC container + real HTTP server | `tests/e2e/` |

```bash
bun test          # 71 tests across 8 files
```

Notable details worth copying into your own project:

- unit tests configure explicit doubles for name-injected repositories (`overrides` keyed by field name),
  and pin `@Value` fields the same way (`overrides: { jwtSecret: ... }`),
- `bun test` loads `.env.test` automatically, which supplies the required `JWT_SECRET` for the
  e2e suite,
- the e2e harness lists only the roots — `createTestApp` follows every `@Inject(Class)` and
  registers the services behind them; components referenced only from decorator options
  (middlewares, validators, static serve) are still listed explicitly,
- web tests assert both the routing (`200`) and the rejection paths (`400` validation, `401` auth),
- the e2e test boots the real OpenAPI post-processor and asserts `@Hidden` routes stay out of the spec,
- the chat e2e flow covers the membership lifecycle end to end: non-member `403`s, idempotent join,
  ownership rules and cascade deletion.

## Configuration

All configuration comes from `process.env` (Bun loads `.env` automatically) — see `.env.example`.
Values needed before the container exists live in `src/env.ts`; component configuration is
injected with `@Value`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `JWT_SECRET` | — (**required**) | JWT signing secret, injected into `AuthService` with `@Value`; the server refuses to boot without it |
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

## Production

```bash
bun run build        # bundle to dist/index.asena.js
JWT_SECRET=<long-random-secret> bun dist/index.asena.js
```

Set `TRUSTED_PROXIES` when the app runs behind a reverse proxy (see [Configuration](#configuration)),
and run `bunx asena doctor` in CI — it catches duplicate core copies, missing decorator flags and
unsafe build settings.

## Migration notes

### 0.10 → 0.12

- **Packages**: `@asenajs/asena` `0.12.1`, `hono-adapter` `5.x`, `asena-drizzle` `4.x`,
  `asena-logger` `3.x`, `asena-openapi` `3.x`, `asena-cli` `0.11`; Bun `>= 1.4`. An `overrides`
  entry in `package.json` pins the CLI's own `@asenajs/asena` dependency to the app's copy so
  only one core is installed (`asena doctor` checks this).
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
