import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createTestApp, silentLogger } from '@asenajs/asena/test';
import { authComponents } from '@asenajs/asena-auth';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { AppConfig } from '../../src/config/AppConfig';
import { AppOpenApi } from '../../src/openapi/AppOpenApi';
import { GlobalCors } from '../../src/middlewares/GlobalCors';
import { AuthRateLimiter } from '../../src/middlewares/AuthRateLimiter';
import { PublicStaticServe } from '../../src/statics/PublicStaticServe';
import { LoginValidator } from '../../src/validators/LoginValidator';
import { SignupValidator } from '../../src/validators/SignupValidator';
import { CreateTodoValidator } from '../../src/validators/TodoValidator';
import { CreateChatRoomValidator, SendMessageValidator } from '../../src/validators/ChatValidator';
import { AuthController } from '../../src/controllers/AuthController';
import { TodoController } from '../../src/controllers/TodoController';
import { HealthController } from '../../src/controllers/HealthController';
import { StaticController } from '../../src/controllers/StaticController';
import { ChatController } from '../../src/controllers/ChatController';
import { AdminController } from '../../src/controllers/AdminController';
import { ChatWebSocket } from '../../src/websockets/ChatWebSocket';
import type { PublicUser, UserRow } from '../../src/services/UserService';
import type { TodoRow } from '../../src/services/TodoService';
import type { ChatRoomRow, MessageRow } from '../../src/services/ChatService';
import type { SessionInfo } from '../../src/services/AuthService';
import type { sessions } from '../../src/database/schemas/session.schema';

/**
 * Full-application tests: the real IoC container, middlewares, validators,
 * services and the real asena-auth stack (guard, AppAuth provider with argon2
 * hashing, DrizzleSessionStore) — only the Drizzle repositories are replaced
 * with in-memory doubles, so the suite runs without PostgreSQL.
 */

type SessionRow = typeof sessions.$inferSelect;

function createUserRepositoryDouble() {
  const users: UserRow[] = [];
  let nextId = 1;

  return {
    users,
    findById: async (id: number) => users.find((user) => user.id === id),
    findByUserName: async (userName: string) => users.find((user) => user.userName === userName),
    existsBy: async (field: keyof UserRow, value: unknown) =>
      users.some((user) => user[field] === value),
    create: async (data: Omit<UserRow, 'id' | 'createdAt' | 'role'>) => {
      // role: the column's DEFAULT 'user'
      const user: UserRow = { id: nextId++, createdAt: new Date(), role: 'user', ...data };
      users.push(user);
      return user;
    },
    findAll: async () => [...users],
    updateById: async (id: number, data: Partial<UserRow>) => {
      const user = users.find((row) => row.id === id);
      if (user) Object.assign(user, data);
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

function createChatRepositoryDouble() {
  const rooms: ChatRoomRow[] = [];
  const members: { roomId: number; userId: number }[] = [];
  const messages: MessageRow[] = [];
  let nextRoomId = 1;
  let nextMessageId = 1;

  return {
    rooms,
    members,
    messages,
    create: async (data: Omit<ChatRoomRow, 'id' | 'createdAt'>) => {
      const room: ChatRoomRow = { id: nextRoomId++, createdAt: new Date(), ...data };
      rooms.push(room);
      return room;
    },
    findAllRooms: async () => [...rooms].reverse(),
    findRoomById: async (id: number) => rooms.find((room) => room.id === id) ?? null,
    deleteById: async (id: number) => {
      const index = rooms.findIndex((room) => room.id === id);
      if (index === -1) return false;
      rooms.splice(index, 1);
      // ON DELETE CASCADE — memberships and messages follow the room.
      for (let i = members.length - 1; i >= 0; i--) {
        if (members[i].roomId === id) members.splice(i, 1);
      }
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].roomId === id) messages.splice(i, 1);
      }
      return true;
    },
    findMember: async (roomId: number, userId: number) =>
      members.some((member) => member.roomId === roomId && member.userId === userId)
        ? { id: 0, roomId, userId, joinedAt: new Date() }
        : null,
    insertMember: async (roomId: number, userId: number) => {
      if (!members.some((member) => member.roomId === roomId && member.userId === userId)) {
        members.push({ roomId, userId });
      }
    },
    deleteMember: async (roomId: number, userId: number) => {
      const index = members.findIndex(
        (member) => member.roomId === roomId && member.userId === userId,
      );
      if (index !== -1) {
        members.splice(index, 1);
      }
    },
    createMessage: async (data: Omit<MessageRow, 'id' | 'createdAt'>) => {
      const { isRead = false, ...rest } = data;
      const message: MessageRow = { id: nextMessageId++, createdAt: new Date(), isRead, ...rest };
      messages.push(message);
      return message;
    },
    findMessageById: async (id: number) => messages.find((message) => message.id === id) ?? null,
    findMessagesByRoomId: async (roomId: number, limit: number) =>
      messages
        .filter((message) => message.roomId === roomId)
        .slice(-limit)
        .reverse(),
    markMessageAsRead: async (id: number) => {
      const message = messages.find((row) => row.id === id);
      if (message) message.isRead = true;
    },
    deleteMessageById: async (id: number) => {
      const index = messages.findIndex((message) => message.id === id);
      if (index !== -1) {
        messages.splice(index, 1);
      }
    },
  };
}

function createSessionRepositoryDouble() {
  const rows = new Map<string, SessionRow>();

  return {
    rows,
    create: async (data: SessionRow) => {
      rows.set(data.id, { ...data });
      return data;
    },
    findById: async (id: string) => rows.get(id) ?? null,
    findAllByUserId: async (userId: number) => [...rows.values()].filter((row) => row.userId === userId),
    updateById: async (id: string, data: Partial<SessionRow>) => {
      const row = rows.get(id);
      if (row) Object.assign(row, data);
      return row;
    },
    deleteById: async (id: string) => rows.delete(id),
    deleteAllByUserId: async (userId: number) => {
      let deleted = 0;
      for (const [id, row] of rows) {
        if (row.userId === userId && rows.delete(id)) deleted++;
      }
      return deleted;
    },
    deleteExpired: async (now: Date) => {
      let deleted = 0;
      for (const [id, row] of rows) {
        if (row.expiresAt < now && rows.delete(id)) deleted++;
      }
      return deleted;
    },
  };
}

const userRepository = createUserRepositoryDouble();
const todoRepository = createTodoRepositoryDouble();
const chatRepository = createChatRepositoryDouble();
const sessionRepository = createSessionRepositoryDouble();

let app: Awaited<ReturnType<typeof createTestApp>>;
let token = '';
let bobToken = '';
let todoId = 0;
let profileImage = '';
let roomId = 0;
let janeMessageId = 0;
let bobMessageId = 0;

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
    // createTestApp follows every @Inject(Class) from these entries, so the
    // services behind the controllers (AuthService, UserService, TodoService,
    // ChatService, FileStorageService) and the AppAuth provider are
    // discovered and registered for real. Components referenced only by
    // decorator options — middlewares, validators, the static-serve class —
    // and the config/post-processors/sockets are not injected by anyone: list
    // them. Route context contracts (Context.define) are plain classes, not
    // components.
    components: [
      AppConfig,
      AppOpenApi,
      GlobalCors,
      AuthRateLimiter,
      LoginValidator,
      SignupValidator,
      CreateTodoValidator,
      CreateChatRoomValidator,
      SendMessageValidator,
      PublicStaticServe,
      AuthController,
      TodoController,
      HealthController,
      StaticController,
      ChatController,
      AdminController,
      ChatWebSocket,
    ],
    // The asena-auth guard, its registry and the WebSocket middleware ship in
    // the package: they come in through imports, exactly as in src/index.ts.
    imports: [...authComponents],
    // Repositories are injected by name ('ChatRepository') or replaced here;
    // a name in overrides also stops the dependency walk.
    overrides: {
      UserRepository: userRepository,
      TodoRepository: todoRepository,
      ChatRepository: chatRepository,
      SessionRepository: sessionRepository,
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

  test('logs in and returns an opaque session token', async () => {
    const response = await app
      .post('/auth/login', json({ userName: 'jane', password: 'supersecret' }))
      .expectStatus(200)
      .expectJsonContains({ success: true });

    token = response.json<{ token: string }>().token;
    expect(token).toHaveLength(43); // 32 random bytes, unpadded base64url

    // only the token's SHA-256 is persisted — never the token itself
    expect(sessionRepository.rows.has(token)).toBe(false);
    expect(sessionRepository.rows.has(new Bun.CryptoHasher('sha256').update(token).digest('hex'))).toBe(
      true,
    );
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

  test('blocks /todos without a session (401 + WWW-Authenticate, app envelope)', async () => {
    const response = await app
      .get('/todos')
      .expectStatus(401)
      .expectJson({ success: false, message: 'Unauthorized' });

    expect(response.headers.get('www-authenticate')).toBe('Bearer');
  });

  test('rejects an unknown bearer token', async () => {
    await app.get('/todos', { headers: { authorization: 'Bearer not-a-real-session' } }).expectStatus(401);
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

describe('Chat API (end to end)', () => {
  test('signs up and logs in a second user (bob)', async () => {
    const form = new FormData();
    form.set('userName', 'bob');
    form.set('firstName', 'Bob');
    form.set('lastName', 'Brown');
    form.set('age', '40');
    form.set('password', 'supersecret');
    form.set('file', new File([new Uint8Array([1])], 'avatar.png', { type: 'image/png' }));

    await fetch(`${app.baseUrl}/auth/signup`, { method: 'POST', body: form }).then((r) =>
      expect(r.status).toBe(201),
    );

    const response = await app
      .post('/auth/login', json({ userName: 'bob', password: 'supersecret' }))
      .expectStatus(200);

    bobToken = response.json<{ token: string }>().token;
    expect(bobToken).not.toBe('');
  });

  test('creates a chat room (creator becomes a member)', async () => {
    const response = await app
      .post('/chat/rooms', authJson({ name: 'General', description: 'Everything' }))
      .expectStatus(201)
      .expectJsonContains({ success: true });

    const room = response.json<{ room: ChatRoomRow }>().room;
    expect(room.createdBy).toBeGreaterThan(0);

    roomId = room.id;
  });

  test('lists the new room for every authenticated user', async () => {
    const response = await app
      .get('/chat/rooms', { headers: { authorization: `Bearer ${bobToken}` } })
      .expectStatus(200);

    expect(response.json<{ rooms: ChatRoomRow[] }>().rooms.some((room) => room.id === roomId)).toBe(
      true,
    );
  });

  test('blocks a non-member from reading room messages (403)', async () => {
    await app
      .get(`/chat/rooms/${roomId}/messages`, { headers: { authorization: `Bearer ${bobToken}` } })
      .expectStatus(403);
  });

  test('the owner can post a message', async () => {
    const response = await app
      .post(`/chat/rooms/${roomId}/messages`, authJson({ content: 'Welcome!' }))
      .expectStatus(201);

    janeMessageId = response.json<{ message: MessageRow }>().message.id;
  });

  test('joining is open and idempotent', async () => {
    const join = () =>
      app
        .post(`/chat/rooms/${roomId}/join`, { headers: { authorization: `Bearer ${bobToken}` } })
        .expectStatus(200);

    await join();
    await join();
  });

  test('a joined member can post messages', async () => {
    const response = await app
      .post(`/chat/rooms/${roomId}/messages`, {
        headers: { authorization: `Bearer ${bobToken}`, 'content-type': 'application/json' },
        body: JSON.stringify({ content: 'Hello Jane!' }),
      })
      .expectStatus(201);

    bobMessageId = response.json<{ message: MessageRow }>().message.id;
  });

  test('members see each others messages, newest first', async () => {
    const response = await app.get(`/chat/rooms/${roomId}/messages`, authHeaders()).expectStatus(200);

    const messages = response.json<{ messages: MessageRow[] }>().messages;

    expect(messages).toHaveLength(2);
    expect(messages[0].id).toBe(bobMessageId);
  });

  test('a member can mark another member message as read', async () => {
    await app
      .post(`/chat/messages/${bobMessageId}/read`, authJson({}))
      .expectStatus(200);
  });

  test('only the sender can delete a message (403 otherwise)', async () => {
    await app
      .delete(`/chat/messages/${janeMessageId}`, { headers: { authorization: `Bearer ${bobToken}` } })
      .expectStatus(403);
  });

  test('the owner cannot leave their own room (403)', async () => {
    await app.post(`/chat/rooms/${roomId}/leave`, authJson({})).expectStatus(403);
  });

  test('only the owner can delete the room (403 otherwise)', async () => {
    await app
      .delete(`/chat/rooms/${roomId}`, { headers: { authorization: `Bearer ${bobToken}` } })
      .expectStatus(403);
  });

  test('leaving revokes access (403 afterwards)', async () => {
    await app
      .post(`/chat/rooms/${roomId}/leave`, { headers: { authorization: `Bearer ${bobToken}` } })
      .expectStatus(200);

    await app
      .get(`/chat/rooms/${roomId}/messages`, { headers: { authorization: `Bearer ${bobToken}` } })
      .expectStatus(403);
  });

  test('the owner deletes the room; messages follow via cascade (404)', async () => {
    await app.delete(`/chat/rooms/${roomId}`, authHeaders()).expectStatus(200);

    await app.get(`/chat/rooms/${roomId}/messages`, authHeaders()).expectStatus(404);
  });
});

/** Opens a socket and resolves with its first message, or rejects when the handshake fails. */
function firstSocketMessage(path: string, protocols?: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${app.baseUrl.replace(/^http/, 'ws')}${path}`, protocols);

    socket.addEventListener('message', (event) => {
      resolve(JSON.parse(String(event.data)));
      socket.close();
    });
    socket.addEventListener('error', () => reject(new Error('handshake refused')));
  });
}

describe('Chat WebSocket (end to end)', () => {
  test('authenticates the upgrade with the bearer subprotocol token', async () => {
    const welcome = await firstSocketMessage('/chat-room', ['bearer', token]);

    expect(welcome).toMatchObject({ type: 'connected', userName: 'jane' });
  });

  test('refuses an upgrade without a session (401 before the socket opens)', async () => {
    await expect(firstSocketMessage('/chat-room')).rejects.toThrow('handshake refused');

    const response = await fetch(`${app.baseUrl}/chat-room`, {
      headers: { upgrade: 'websocket', connection: 'Upgrade' },
    });
    expect(response.status).toBe(401);
  });
});

describe('Sessions (end to end)', () => {
  const login = (userName: string, headers: Record<string, string> = {}) =>
    app.post('/auth/login', {
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify({ userName, password: 'supersecret' }),
    });

  const bearer = (value: string) => ({ headers: { authorization: `Bearer ${value}` } });

  test('login also writes an HttpOnly session cookie that authenticates browsers', async () => {
    const response = await login('jane').expectStatus(200);
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(setCookie).toContain('asena_session=');
    expect(setCookie).toContain('HttpOnly');

    const cookie = setCookie.split(';')[0]!;

    await app.get('/auth/me', { headers: { cookie } }).expectStatus(200);
  });

  test('a cookie sent cross-site on a state-changing request does not count (CSRF check)', async () => {
    const cookie = ((await login('jane')).headers.get('set-cookie') ?? '').split(';')[0]!;
    const crossSite = { cookie, origin: 'https://evil.example', 'content-type': 'application/json' };

    await app.post('/todos', { headers: crossSite, body: JSON.stringify({ title: 'csrf' }) }).expectStatus(401);

    // an origin listed in ALLOWED_ORIGINS keeps the cookie
    await app
      .post('/todos', {
        headers: { ...crossSite, origin: 'http://localhost:5173' },
        body: JSON.stringify({ title: 'from the SPA' }),
      })
      .expectStatus(201);
  });

  test('lists the active sessions and flags the current one', async () => {
    const response = await app.get('/auth/sessions', authHeaders()).expectStatus(200);
    const list = response.json<{ sessions: SessionInfo[] }>().sessions;

    expect(list.length).toBeGreaterThanOrEqual(3); // three logins as jane so far
    expect(list.filter((session) => session.current)).toHaveLength(1);
  });

  test('revokes one of the own sessions — that token is a 401 on its next request', async () => {
    const other = (await login('jane')).json<{ token: string }>().token;
    const list = (await app.get('/auth/sessions', bearer(other)).expectStatus(200)).json<{
      sessions: SessionInfo[];
    }>().sessions;
    const otherId = list.find((session) => session.current)!.id;

    await app.delete(`/auth/sessions/${otherId}`, authHeaders()).expectStatus(200);

    await app.get('/auth/me', bearer(other)).expectStatus(401);
    await app.get('/auth/me', authHeaders()).expectStatus(200);
  });

  test('cannot revoke another user session (404, nothing revoked)', async () => {
    const list = (await app.get('/auth/sessions', authHeaders()).expectStatus(200)).json<{
      sessions: SessionInfo[];
    }>().sessions;
    const janeSessionId = list.find((session) => session.current)!.id;

    await app.delete(`/auth/sessions/${janeSessionId}`, bearer(bobToken)).expectStatus(404);
    await app.get('/auth/me', authHeaders()).expectStatus(200);
  });

  test('logout ends the current session only', async () => {
    const second = (await login('jane')).json<{ token: string }>().token;

    await app.post('/auth/logout', bearer(second)).expectStatus(200);

    await app.get('/auth/me', bearer(second)).expectStatus(401);
    await app.get('/auth/me', authHeaders()).expectStatus(200);
  });

  test('logout-all signs the user out on every device', async () => {
    await app.post('/auth/logout-all', authHeaders()).expectStatus(200);

    await app.get('/auth/me', authHeaders()).expectStatus(401);
    await app.get('/todos', authHeaders()).expectStatus(401);
    // other users are untouched
    await app.get('/auth/me', bearer(bobToken)).expectStatus(200);
  });
});

describe('Admin & roles (end to end)', () => {
  const login = (userName: string) =>
    app.post('/auth/login', json({ userName, password: 'supersecret' })).expectStatus(200);
  const bearer = (value: string, body?: unknown) => ({
    headers: { authorization: `Bearer ${value}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const userId = (userName: string) => userRepository.users.find((user) => user.userName === userName)!.id;

  let adminToken = '';

  test('signup ignores a role sent by the client — every new user is a plain user', async () => {
    const form = new FormData();
    form.set('userName', 'mallory');
    form.set('firstName', 'Mallory');
    form.set('lastName', 'M');
    form.set('age', '30');
    form.set('password', 'supersecret');
    form.set('role', 'admin');
    form.set('file', new File([new Uint8Array([1])], 'avatar.png', { type: 'image/png' }));

    const response = await fetch(`${app.baseUrl}/auth/signup`, { method: 'POST', body: form });

    expect(response.status).toBe(201);
    expect(((await response.json()) as { user: PublicUser }).user.role).toBe('user');
  });

  test('a plain user gets 403 on admin routes', async () => {
    await app.get('/admin/users', bearer(bobToken)).expectStatus(403);
  });

  test('a promotion applies from the next login — sessions keep their snapshot roles', async () => {
    const before = (await login('jane')).json<{ token: string }>().token;

    // what `bun run user:admin jane` does in the database
    userRepository.users.find((user) => user.userName === 'jane')!.role = 'admin';

    await app.get('/admin/users', bearer(before)).expectStatus(403);

    adminToken = (await login('jane')).json<{ token: string }>().token;

    const users = (await app.get('/admin/users', bearer(adminToken)).expectStatus(200)).json<{
      users: PublicUser[];
    }>().users;

    expect(users.map((user) => user.userName)).toContain('bob');
    expect(users.some((user) => 'passwordHash' in user)).toBe(false);
  });

  test('an admin cannot change their own role (403)', async () => {
    await app
      .put(`/admin/users/${userId('jane')}/role`, bearer(adminToken, { role: 'user' }))
      .expectStatus(403);
  });

  test('unknown users are a 404, unknown roles a 400', async () => {
    await app.put('/admin/users/9999/role', bearer(adminToken, { role: 'admin' })).expectStatus(404);
    await app
      .put(`/admin/users/${userId('bob')}/role`, bearer(adminToken, { role: 'superuser' }))
      .expectStatus(400);
  });

  test('changing a role ends every session of that user', async () => {
    const response = await app
      .put(`/admin/users/${userId('bob')}/role`, bearer(adminToken, { role: 'admin' }))
      .expectStatus(200);

    expect(response.json<{ user: PublicUser }>().user.role).toBe('admin');

    // bob's session carried the old role — it is gone, not silently stale
    await app.get('/auth/me', bearer(bobToken)).expectStatus(401);

    const bobAdmin = (await login('bob')).json<{ token: string }>().token;
    await app.get('/admin/users', bearer(bobAdmin)).expectStatus(200);
  });
});
