# AsenaJS Example — Todo API

A production-shaped **Todo application** built with [AsenaJS](https://asena.sh) — the decorator-based
IoC web framework for the [Bun](https://bun.sh) runtime. Think "NestJS/Spring Boot style", but native
to Bun: TypeScript decorators for wiring, field-based dependency injection, and an HTTP layer that
binds directly to `Bun.serve()` through the Hono adapter.

This repo is a **reference application**: every feature is implemented the way the framework
recommends, so you can copy patterns directly into your own project — JWT authentication, Zod
validation, OpenAPI docs generated from those same validators, PostgreSQL access through Drizzle
with declarative transactions, file uploads, static serving, and a three-level test suite.

> Originally written against AsenaJS `0.1.x`, fully modernized to `0.10.x` +
> `@asenajs/hono-adapter` `3.x`. Short migration notes are at the [end](#migration-notes-from-01x).

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

## Architecture

```
            HTTP request
                 │
   ┌─────────────▼──────────────┐
   │  Middleware chain           │  GlobalCors → AuthRateLimiter / AuthMiddleware → Validator
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
- Validators check request *shape*; services check *meaning*.

## Features

| Area | What is demonstrated | Where |
|---|---|---|
| Bootstrap | `AsenaServerFactory` + `createHonoAdapter` (tuple form) + `AsenaLogger` | `src/index.ts` |
| IoC | Field-based `@Inject`, `@OnStart` lifecycle, layered architecture | everywhere |
| Validation | Zod 4 validators (`json()`, `form()`), typed bodies via `req.valid()` | `src/validators/` |
| OpenAPI 3.1 | Spec generated **from the validators**, Swagger UI, `@Hidden` routes, response schemas | `src/openapi/AppOpenApi.ts` |
| Auth | JWT bearer tokens (`hono/jwt`, 12h), Argon2id hashing (`Bun.password`), token → live-user lookup | `src/services/AuthService.ts` |
| Middleware | Global/controller/route levels, adapter built-ins subclassed (CORS, rate limiter) | `src/middlewares/` |
| Database | `@Database` (bun-sql driver), `@Repository` + `BaseRepository`, migrations auto-applied on boot | `src/database/`, `src/repositories/` |
| Transactions | `@Transaction()` via `AsyncLocalStorage` — signup creates user + welcome todo atomically | `src/services/AuthService.ts` |
| File upload | Multipart signup with optional profile image (`z.file()`), safe generated file names | `src/services/FileStorageService.ts` |
| Static files | `@StaticServe` serving `public/` under `/static` | `src/statics/PublicStaticServe.ts` |
| Errors | Central `onError`/`onNotFound`, `HttpException`, `isValidationError()` before `isHttpException()` | `src/config/AppConfig.ts` |
| Testing | `mockComponent` (unit), `createWebTest` (web slice), `createTestApp` (e2e) — no DB needed | `tests/` |

## Requirements

- [Bun](https://bun.sh) >= 1.3.12
- PostgreSQL 14+ (any instance reachable on `DB_HOST`; a Docker one-liner is below)

## Quickstart

```bash
# 1. install dependencies
bun install

# 2. start PostgreSQL (or point .env at your own instance)
docker run -d --name asena-postgres \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=asena_example \
  -p 5432:5432 postgres:16

# 3. (optional) configure the app
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
├─ env.ts                       # process.env access with defaults
├─ config/
│  ├─ AppConfig.ts              # @Config: global CORS, onError / onNotFound error model
│  └─ AppDrizzle.ts             # @Drizzle post-processor enabling @Transaction
├─ database/
│  ├─ schemas/                  # Drizzle table definitions (users, todos)
│  ├─ MainDatabase.ts           # @Database (bun-sql) — pool managed by the framework
│  └─ MigrateService.ts         # applies ./drizzle migrations on @OnStart
├─ repositories/                # @Repository + BaseRepository, one per domain
├─ services/                    # business logic; services own the invariants
├─ middlewares/                 # AuthMiddleware, GlobalCors, AuthRateLimiter
├─ validators/                  # Zod validators — validate requests AND feed OpenAPI
├─ controllers/                 # thin HTTP layer only
├─ statics/                     # @StaticServe for public/
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
| `GET` | `/openapi`, `/openapi/ui` | — | Generated spec + Swagger UI |
| `GET` | `/health` | — | Health check (hidden from the spec) |

Every response uses the same envelope: `{ success: true, ...data }` or
`{ success: false, message, errors? }`. Validation failures return a structured `400` with
per-field details, domain errors (`HttpException`) keep their status (401/404/409), and unmatched
routes hit the custom `onNotFound` handler.

## Testing

The suite runs on Bun's test runner and needs **no PostgreSQL** — the e2e harness replaces the
Drizzle repositories with in-memory doubles via `overrides`.

| Level | Utility | Boots | Files |
|---|---|---|---|
| Unit | `mockComponent` | Nothing — dependencies auto-mocked | `tests/unit/` |
| Web slice | `createWebTest` | Real controllers, validators, middleware | `tests/web/` |
| Full app | `createTestApp` | Whole IoC container + real HTTP server | `tests/e2e/` |

```bash
bun test          # 38 tests across 6 files
```

Notable details worth copying into your own project:

- unit tests configure explicit doubles for name-injected repositories (`overrides` keyed by field name),
- web tests assert both the routing (`200`) and the rejection paths (`400` validation, `401` auth),
- the e2e test boots the real OpenAPI post-processor and asserts `@Hidden` routes stay out of the spec.

## Configuration

All configuration is read from `process.env` (Bun loads `.env` automatically) — see `.env.example`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `JWT_SECRET` | dev fallback | JWT signing secret — **set a real one in production** |
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
bun dist/index.asena.js
```

## Migration notes (from 0.1.x)

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
- **Testing**: none → 38 tests across unit / web-slice / e2e levels.
- **Tooling**: ESLint flat config, `asena-config.ts` for builds, Drizzle migrations committed
  under `drizzle/`, folder layout matching the CLI conventions (`src/controllers/`, `src/services/`, …).
