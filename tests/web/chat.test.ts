import { test, expect } from 'bun:test';
import { createWebTest, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { ChatController } from '../../src/controllers/ChatController';

/**
 * Web-slice tests for the protected /chat controller — the controller-level
 * AuthMiddleware, every validator and every route context contract run for real.
 */
const authHeaders = {
  headers: { authorization: 'Bearer valid-token', 'content-type': 'application/json' },
};

test('GET /chat/rooms is rejected without a bearer token', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app } = await createWebTest({ adapter, controllers: [ChatController] });

  await app.get('/chat/rooms').expectStatus(401);

  await app.stop();
});

test('GET /chat/rooms lists all rooms for an authenticated user', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });
  mocks.ChatService.getRooms.mockResolvedValue([{ id: 1, name: 'General', createdBy: 7 }]);

  await app.get('/chat/rooms', authHeaders).expectStatus(200).expectJsonContains({
    success: true,
  });

  expect(mocks.ChatService.getRooms).toHaveBeenCalled();

  await app.stop();
});

test('POST /chat/rooms rejects a too-short name with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });

  await app
    .post('/chat/rooms', { ...authHeaders, body: JSON.stringify({ name: 'ab' }) })
    .expectStatus(400);

  expect(mocks.ChatService.createRoom).not.toHaveBeenCalled();

  await app.stop();
});

test('POST /chat/rooms passes the validated body to the service', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });
  mocks.ChatService.createRoom.mockResolvedValue({ id: 1, name: 'General', createdBy: 7 });

  await app
    .post('/chat/rooms', { ...authHeaders, body: JSON.stringify({ name: 'General' }) })
    .expectStatus(201)
    .expectJsonContains({ success: true });

  expect(mocks.ChatService.createRoom).toHaveBeenCalledWith(7, { name: 'General' });

  await app.stop();
});

test('GET /chat/rooms/:id rejects a non-numeric id with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });

  await app.get('/chat/rooms/not-a-number', authHeaders).expectStatus(400);

  expect(mocks.ChatService.getRoom).not.toHaveBeenCalled();

  await app.stop();
});

test('POST /chat/rooms/:id/messages rejects empty content with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });

  await app
    .post('/chat/rooms/1/messages', { ...authHeaders, body: JSON.stringify({ content: '' }) })
    .expectStatus(400);

  expect(mocks.ChatService.createMessage).not.toHaveBeenCalled();

  await app.stop();
});

test('GET /chat/rooms/:id/messages coerces ?limit through the route contract', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });
  mocks.ChatService.getMessages.mockResolvedValue([]);

  await app.get('/chat/rooms/4/messages?limit=20', authHeaders).expectStatus(200);
  expect(mocks.ChatService.getMessages).toHaveBeenCalledWith(7, 4, 20);

  await app.get('/chat/rooms/4/messages', authHeaders).expectStatus(200);
  expect(mocks.ChatService.getMessages).toHaveBeenLastCalledWith(7, 4, undefined);

  await app.stop();
});

test('GET /chat/rooms/:id/messages rejects a non-numeric ?limit with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [ChatController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 7, userName: 'joe' });

  await app
    .get('/chat/rooms/4/messages?limit=abc', authHeaders)
    .expectStatus(400)
    .expectJsonContains({ error: 'Validation failed', target: 'query' });

  expect(mocks.ChatService.getMessages).not.toHaveBeenCalled();

  await app.stop();
});
