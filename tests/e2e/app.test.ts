import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createTestApp, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AppConfig } from '../../src/config/AppConfig';
import { AppOpenApi } from '../../src/openapi/AppOpenApi';
import { GlobalCors } from '../../src/middlewares/GlobalCors';
import { AuthMiddleware } from '../../src/middlewares/AuthMiddleware';
import { AuthRateLimiter } from '../../src/middlewares/AuthRateLimiter';
import { AuthController } from '../../src/controllers/AuthController';
import { TodoController } from '../../src/controllers/TodoController';
import { HealthController } from '../../src/controllers/HealthController';
import { StaticController } from '../../src/controllers/StaticController';
import { PublicStaticServe } from '../../src/statics/PublicStaticServe';
import { AuthService } from '../../src/services/AuthService';
import { UserService, type UserRow } from '../../src/services/UserService';
import { TodoService, type TodoRow } from '../../src/services/TodoService';
import { FileStorageService } from '../../src/services/FileStorageService';
import { LoginValidator } from '../../src/validators/LoginValidator';
import { SignupValidator } from '../../src/validators/SignupValidator';
import { CreateTodoValidator, TodoIdValidator, UpdateTodoValidator } from '../../src/validators/TodoValidator';

/**
 * Full-application tests: the real IoC container, middlewares, validators and
 * services — only the Drizzle repositories are replaced with in-memory
 * doubles, so the suite runs without PostgreSQL.
 */

function createUserRepositoryDouble() {
  const users: UserRow[] = [];
  let nextId = 1;

  return {
    users,
    findById: async (id: number) => users.find((user) => user.id === id),
    findByUserName: async (userName: string) => users.find((user) => user.userName === userName),
    existsBy: async (field: keyof UserRow, value: unknown) =>
      users.some((user) => user[field] === value),
    create: async (data: Omit<UserRow, 'id' | 'createdAt'>) => {
      const user: UserRow = { id: nextId++, createdAt: new Date(), ...data };
      users.push(user);
      return user;
    },
  };
}

function createTodoRepositoryDouble() {
  const todos: TodoRow[] = [];
  let nextId = 1;

  return {
    todos,
    findAllByUserId: async (userId: number) => todos.filter((todo) => todo.userId === userId),
    findOneByUserIdAndId: async (id: number, userId: number) =>
      todos.find((todo) => todo.id === id && todo.userId === userId),
    create: async (data: Omit<TodoRow, 'id' | 'createdAt'>) => {
      const todo: TodoRow = { id: nextId++, createdAt: new Date(), ...data };
      todos.push(todo);
      return todo;
    },
    updateById: async (id: number, data: Partial<TodoRow>) => {
      const todo = todos.find((t) => t.id === id)!;
      Object.assign(todo, data);
      return todo;
    },
    deleteById: async (id: number) => {
      const index = todos.findIndex((todo) => todo.id === id);
      todos.splice(index, 1);
    },
  };
}

const userRepository = createUserRepositoryDouble();
const todoRepository = createTodoRepositoryDouble();

let app: Awaited<ReturnType<typeof createTestApp>>;
let token = '';
let todoId = 0;
let profileImage = '';

const authHeaders = () => ({ headers: { authorization: `Bearer ${token}` } });
const json = (body: unknown) => ({ headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const authJson = (body: unknown) => ({
  headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

beforeAll(async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });

  app = await createTestApp({
    adapter,
    components: [
      AppConfig,
      AppOpenApi,
      GlobalCors,
      AuthMiddleware,
      AuthRateLimiter,
      LoginValidator,
      SignupValidator,
      CreateTodoValidator,
      UpdateTodoValidator,
      TodoIdValidator,
      AuthController,
      TodoController,
      HealthController,
      StaticController,
      PublicStaticServe,
      AuthService,
      UserService,
      TodoService,
      FileStorageService,
    ],
    overrides: {
      UserRepository: userRepository,
      TodoRepository: todoRepository,
    },
  });
});

afterAll(async () => {
  await app.stop();

  // remove files written by the signup test
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  for (const file of await fs.readdir(uploadsDir)) {
    if (file !== '.gitkeep') {
      await fs.rm(path.join(uploadsDir, file));
    }
  }
});

describe('Todo API (end to end)', () => {
  test('serves the generated OpenAPI 3.1 spec with hidden routes excluded', async () => {
    const response = await app.get('/openapi').expectStatus(200);

    const spec = response.json<{
      openapi: string;
      paths: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    }>();

    expect(spec.openapi).toBe('3.1.0');
    expect(Object.keys(spec.paths)).toContain('/todos/{id}');
    expect(Object.keys(spec.paths)).toContain('/auth/login');
    // @Hidden() routes stay out of the spec
    expect(Object.keys(spec.paths)).not.toContain('/health');
    expect(Object.keys(spec.paths)).not.toContain('/static/*');
  });

  test('rejects an invalid login payload with a 400 validation envelope', async () => {
    await app
      .post('/auth/login', json({ userName: 'jane' }))
      .expectStatus(400)
      .expectJsonContains({ success: false, message: 'Validation failed' });
  });

  test('signs up a new user with a multipart profile image', async () => {
    const form = new FormData();
    form.set('userName', 'jane');
    form.set('firstName', 'Jane');
    form.set('lastName', 'Doe');
    form.set('age', '30');
    form.set('password', 'supersecret');
    form.set('file', new File([new Uint8Array([1, 2, 3, 4])], 'avatar.png', { type: 'image/png' }));

    const response = await fetch(`${app.baseUrl}/auth/signup`, { method: 'POST', body: form });

    expect(response.status).toBe(201);

    const body = (await response.json()) as { user: { userName: string; profileImage: string } };

    expect(body.user.userName).toBe('jane');
    expect(body.user.profileImage).toStartWith('/static/uploads/');

    profileImage = body.user.profileImage;
  });

  test('rejects a duplicate user name with 409', async () => {
    const form = new FormData();
    form.set('userName', 'jane');
    form.set('firstName', 'Jane');
    form.set('lastName', 'Doe');
    form.set('age', '30');
    form.set('password', 'supersecret');
    form.set('file', new File([new Uint8Array([1])], 'avatar.png', { type: 'image/png' }));

    const response = await fetch(`${app.baseUrl}/auth/signup`, { method: 'POST', body: form });

    expect(response.status).toBe(409);
  });

  test('serves the uploaded file through @StaticServe', async () => {
    await app.get(profileImage).expectStatus(200);
  });

  test('logs in and returns a bearer token', async () => {
    const response = await app
      .post('/auth/login', json({ userName: 'jane', password: 'supersecret' }))
      .expectStatus(200)
      .expectJsonContains({ success: true });

    token = response.json<{ token: string }>().token;
    expect(token).not.toBe('');
  });

  test('rejects a wrong password with 401', async () => {
    await app
      .post('/auth/login', json({ userName: 'jane', password: 'wrongpass' }))
      .expectStatus(401);
  });

  test('GET /auth/me returns the authenticated user', async () => {
    const response = await app
      .get('/auth/me', authHeaders())
      .expectStatus(200)
      .expectJsonContains({ success: true });

    expect(response.json<{ user: { userName: string } }>().user.userName).toBe('jane');
  });

  test('blocks /todos without a token', async () => {
    await app.get('/todos').expectStatus(401);
  });

  test('lists the welcome todo created during signup', async () => {
    const response = await app.get('/todos', authHeaders()).expectStatus(200);

    const todos = response.json<TodoRow[]>();

    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe('Welcome to Asena!');
  });

  test('creates a todo with defaults applied by the validator', async () => {
    const response = await app
      .post('/todos', authJson({ title: 'Buy milk' }))
      .expectStatus(201);

    const todo = response.json<TodoRow>();

    expect(todo.title).toBe('Buy milk');
    expect(todo.isCompleted).toBe(false); // zod default applied

    todoId = todo.id;
  });

  test('rejects an invalid todo payload with 400', async () => {
    await app
      .post('/todos', authJson({ title: '' }))
      .expectStatus(400);
  });

  test('rejects a non-numeric :id with 400', async () => {
    await app.get('/todos/not-a-number', authHeaders()).expectStatus(400);
  });

  test('updates a todo', async () => {
    await app
      .put(`/todos/${todoId}`, authJson({ isCompleted: true }))
      .expectStatus(200)
      .expectJsonContains({ isCompleted: true });
  });

  test('deletes a todo and then reports it as 404', async () => {
    await app.delete(`/todos/${todoId}`, authHeaders()).expectStatus(200);
    await app.get(`/todos/${todoId}`, authHeaders()).expectStatus(404);
  });

  test('answers unmatched routes with the custom 404 envelope', async () => {
    await app.get('/nope').expectStatus(404).expectJsonContains({ success: false });
  });

  test('exposes the health check', async () => {
    await app.get('/health').expectStatus(200).expectJsonContains({ status: 'ok' });
  });
});
