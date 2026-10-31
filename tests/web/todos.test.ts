import { test, expect } from 'bun:test';
import { createWebTest, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { TodoController } from '../../src/controllers/TodoController';

/**
 * Web-slice tests for the protected /todos controller — the controller-level
 * AuthMiddleware, every validator and every route context contract run for real.
 */
const authHeaders = {
  headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
};

test('GET /todos is rejected without a bearer token', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app } = await createWebTest({ adapter, controllers: [TodoController] });

  await app.get('/todos').expectStatus(401);

  await app.stop();
});

test('GET /todos lists the authenticated user todos', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [TodoController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });
  mocks.TodoService.getTodos.mockResolvedValue([{ id: 1, title: 'Buy milk', isCompleted: false }]);

  await app.get('/todos', authHeaders).expectStatus(200).expectJson([
    { id: 1, title: 'Buy milk', isCompleted: false },
  ]);

  expect(mocks.TodoService.getTodos).toHaveBeenCalledWith(7);

  await app.stop();
});

test('GET /todos/:id rejects a non-numeric id with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [TodoController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });

  await app.get('/todos/not-a-number', authHeaders).expectStatus(400);

  expect(mocks.TodoService.getTodoById).not.toHaveBeenCalled();

  await app.stop();
});

test('POST /todos rejects an empty title with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [TodoController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });

  await app
    .post('/todos', { ...authHeaders, body: JSON.stringify({ title: '' }) })
    .expectStatus(400)
    .expectJsonContains({ error: 'Validation failed' });

  expect(mocks.TodoService.createTodo).not.toHaveBeenCalled();

  await app.stop();
});

test('PUT /todos/:id passes the validated body to the service', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [TodoController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });
  mocks.TodoService.updateTodo.mockResolvedValue({ id: 3, title: 'Buy milk', isCompleted: true });

  await app
    .put('/todos/3', { ...authHeaders, body: JSON.stringify({ isCompleted: true }) })
    .expectStatus(200)
    .expectJsonContains({ isCompleted: true });

  expect(mocks.TodoService.updateTodo).toHaveBeenCalledWith(3, 7, { isCompleted: true });

  await app.stop();
});

test('PUT /todos/:id hands the service only the contract output (unknown keys stripped)', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [TodoController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });
  mocks.TodoService.updateTodo.mockResolvedValue({ id: 3, title: 'Renamed', isCompleted: false });

  // userId is not part of the update schema — a mass-assignment attempt.
  await app
    .put('/todos/3', { ...authHeaders, body: JSON.stringify({ title: 'Renamed', userId: 99 }) })
    .expectStatus(200);

  expect(mocks.TodoService.updateTodo).toHaveBeenCalledWith(3, 7, { title: 'Renamed' });

  await app.stop();
});
