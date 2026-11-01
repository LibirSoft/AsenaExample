import { test, expect } from 'bun:test';
import { createWebTest, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { TodoController } from '../../src/controllers/TodoController';
import { asJoe, testAuthComponents } from '../support/testAuth';

/**
 * Web-slice tests for the protected /todos controller — the asena-auth guard,
 * every validator and every route context contract run for real; the session
 * comes from the x-test-user header (see tests/support/testAuth.ts).
 */
const json = (body: unknown) => ({
  headers: { ...asJoe, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const createTodoWebTest = () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });

  return createWebTest({ adapter, controllers: [TodoController], components: testAuthComponents });
};

test('GET /todos is rejected without a session (401 + WWW-Authenticate)', async () => {
  const { app } = await createTodoWebTest();

  const response = await app.get('/todos').expectStatus(401);

  expect(response.headers.get('www-authenticate')).toBe('Bearer');

  await app.stop();
});

test('the guard runs before validation: an anonymous invalid body is a 401, not a 400', async () => {
  const { app, mocks } = await createTodoWebTest();

  await app
    .post('/todos', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: '' }) })
    .expectStatus(401);

  expect(mocks.TodoService.createTodo).not.toHaveBeenCalled();

  await app.stop();
});

test('GET /todos lists the authenticated user todos', async () => {
  const { app, mocks } = await createTodoWebTest();

  mocks.TodoService.getTodos.mockResolvedValue([{ id: 1, title: 'Buy milk', isCompleted: false }]);

  await app.get('/todos', { headers: asJoe }).expectStatus(200).expectJson([
    { id: 1, title: 'Buy milk', isCompleted: false },
  ]);

  // The session id is a string ('7'); currentUser() hands services the numeric id.
  expect(mocks.TodoService.getTodos).toHaveBeenCalledWith(7);

  await app.stop();
});

test('GET /todos/:id rejects a non-numeric id with 400', async () => {
  const { app, mocks } = await createTodoWebTest();

  await app.get('/todos/not-a-number', { headers: asJoe }).expectStatus(400);

  expect(mocks.TodoService.getTodoById).not.toHaveBeenCalled();

  await app.stop();
});

test('POST /todos rejects an empty title with 400', async () => {
  const { app, mocks } = await createTodoWebTest();

  await app
    .post('/todos', json({ title: '' }))
    .expectStatus(400)
    .expectJsonContains({ error: 'Validation failed' });

  expect(mocks.TodoService.createTodo).not.toHaveBeenCalled();

  await app.stop();
});

test('PUT /todos/:id passes the validated body to the service', async () => {
  const { app, mocks } = await createTodoWebTest();

  mocks.TodoService.updateTodo.mockResolvedValue({ id: 3, title: 'Buy milk', isCompleted: true });

  await app
    .put('/todos/3', json({ isCompleted: true }))
    .expectStatus(200)
    .expectJsonContains({ isCompleted: true });

  expect(mocks.TodoService.updateTodo).toHaveBeenCalledWith(3, 7, { isCompleted: true });

  await app.stop();
});

test('PUT /todos/:id hands the service only the contract output (unknown keys stripped)', async () => {
  const { app, mocks } = await createTodoWebTest();

  mocks.TodoService.updateTodo.mockResolvedValue({ id: 3, title: 'Renamed', isCompleted: false });

  // userId is not part of the update schema — a mass-assignment attempt.
  await app.put('/todos/3', json({ title: 'Renamed', userId: 99 })).expectStatus(200);

  expect(mocks.TodoService.updateTodo).toHaveBeenCalledWith(3, 7, { title: 'Renamed' });

  await app.stop();
});
