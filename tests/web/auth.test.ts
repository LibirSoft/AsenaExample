import { test, expect, mock } from 'bun:test';
import { createWebTest, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { AuthController } from '../../src/controllers/AuthController';
import { asJoe, testAuthComponents } from '../support/testAuth';

/**
 * Web-slice tests: the controller, its validators, middlewares and the
 * asena-auth guard are real; AuthService is an auto-generated mock keyed by
 * component name. The session comes from the x-test-user header.
 *
 * AppAuth gets an explicit stub instead: an auto-mock has no getters, and the
 * cookie helpers read the provider's cookieName/cookieOptions.
 */
const createAuthWebTest = () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });

  const appAuth = {
    cookieName: 'asena_session',
    cookieOptions: { httpOnly: true, path: '/', secure: true, sameSite: 'lax', maxAge: 3600 },
    logout: mock(async () => {}),
  };

  return createWebTest({
    adapter,
    controllers: [AuthController],
    components: testAuthComponents,
    overrides: { AppAuth: appAuth },
  });
};

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});

test('POST /auth/login rejects an invalid payload with 400', async () => {
  const { app } = await createAuthWebTest();

  await app
    .post('/auth/login', json({ userName: 'joe' }))
    .expectStatus(400)
    .expectJsonContains({ error: 'Validation failed' });

  await app.stop();
});

test('POST /auth/login returns the token and writes it as the session cookie', async () => {
  const { app, mocks } = await createAuthWebTest();

  mocks.AuthService.login.mockResolvedValue({ token: 'session-token', user: { id: 1, userName: 'joe' } });

  const response = await app
    .post('/auth/login', json({ userName: 'joe', password: 'secret123' }))
    .expectStatus(200)
    .expectJsonContains({ success: true, token: 'session-token' });

  expect(mocks.AuthService.login).toHaveBeenCalledWith('joe', 'secret123');

  const cookie = response.headers.get('set-cookie') ?? '';
  expect(cookie).toContain('asena_session=session-token');
  expect(cookie).toContain('HttpOnly');

  await app.stop();
});

test('protected /auth routes answer 401 without a session', async () => {
  const { app, mocks } = await createAuthWebTest();

  await app.get('/auth/me').expectStatus(401);
  await app.get('/auth/sessions').expectStatus(401);
  await app.post('/auth/logout').expectStatus(401);
  await app.post('/auth/logout-all').expectStatus(401);

  expect(mocks.AuthService.getProfile).not.toHaveBeenCalled();

  await app.stop();
});

test('GET /auth/me loads the live profile of the session user', async () => {
  const { app, mocks } = await createAuthWebTest();

  mocks.AuthService.getProfile.mockResolvedValue({ id: 7, userName: 'joe', age: 30 });

  const response = await app.get('/auth/me', { headers: asJoe }).expectStatus(200);

  expect(response.json<{ user: { userName: string } }>().user.userName).toBe('joe');
  expect(mocks.AuthService.getProfile).toHaveBeenCalledWith(7);

  await app.stop();
});

test('DELETE /auth/sessions/:id rejects a malformed session id with 400', async () => {
  const { app, mocks } = await createAuthWebTest();

  await app.delete('/auth/sessions/not-a-session-id', { headers: asJoe }).expectStatus(400);

  expect(mocks.AuthService.revokeSession).not.toHaveBeenCalled();

  await app.stop();
});

test('DELETE /auth/sessions/:id hands the service the user and the session id', async () => {
  const { app, mocks } = await createAuthWebTest();
  const sessionId = 'a'.repeat(64);

  mocks.AuthService.revokeSession.mockResolvedValue(undefined);

  await app.delete(`/auth/sessions/${sessionId}`, { headers: asJoe }).expectStatus(200);

  expect(mocks.AuthService.revokeSession).toHaveBeenCalledWith(7, sessionId);

  await app.stop();
});

test('POST /auth/logout ends the session through the provider', async () => {
  const { app, mocks } = await createAuthWebTest();

  await app.post('/auth/logout', { headers: asJoe }).expectStatus(200);

  expect(mocks.AppAuth.logout).toHaveBeenCalledTimes(1);

  await app.stop();
});
