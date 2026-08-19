import { test, expect } from 'bun:test';
import { createWebTest, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { AuthController } from '../../src/controllers/AuthController';

/**
 * Web-slice tests: the controller, its validators and middlewares are real;
 * every injected service is an auto-generated mock (keyed by service name).
 */
test('POST /auth/login rejects an invalid payload with 400', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app } = await createWebTest({ adapter, controllers: [AuthController] });

  await app
    .post('/auth/login', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userName: 'joe' }) })
    .expectStatus(400)
    .expectJsonContains({ error: 'Validation failed' });

  await app.stop();
});

test('POST /auth/login returns a token for valid credentials', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [AuthController] });

  mocks.AuthService.login.mockResolvedValue({ token: 'jwt-token', user: { id: 1, userName: 'joe' } });

  await app
    .post('/auth/login', { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ userName: 'joe', password: 'secret123' }) })
    .expectStatus(200)
    .expectJsonContains({ success: true, token: 'jwt-token' });

  expect(mocks.AuthService.login).toHaveBeenCalledWith('joe', 'secret123');

  await app.stop();
});

test('GET /auth/me requires a bearer token', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app } = await createWebTest({ adapter, controllers: [AuthController] });

  await app.get('/auth/me').expectStatus(401);

  await app.stop();
});

test('GET /auth/me returns the user attached by AuthMiddleware', async () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });
  const { app, mocks } = await createWebTest({ adapter, controllers: [AuthController] });

  mocks.AuthService.getUserFromToken.mockResolvedValue({ id: 1, userName: 'joe', age: 30 });

  const response = await app
    .get('/auth/me', { headers: { authorization: 'Bearer valid-token' } })
    .expectStatus(200)
    .expectJsonContains({ success: true });

  expect(response.json<{ user: { userName: string } }>().user.userName).toBe('joe');
  expect(mocks.AuthService.getUserFromToken).toHaveBeenCalledWith('valid-token');

  await app.stop();
});
