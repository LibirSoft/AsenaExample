import { test, expect } from 'bun:test';
import { createWebTest, silentLogger } from '@asenajs/asena/test';
import { createHonoAdapter } from '@asenajs/hono-adapter';
import { AdminController } from '../../src/controllers/AdminController';
import { asAda, asJoe, testAuthComponents } from '../support/testAuth';

/**
 * Web-slice tests for the @Roles('admin') controller: the guard and the route
 * contract are real, the services are auto-mocked. joe holds the 'user' role,
 * ada the 'admin' role (tests/support/testAuth.ts).
 */
const createAdminWebTest = () => {
  const [adapter] = createHonoAdapter({ logger: silentLogger });

  return createWebTest({ adapter, controllers: [AdminController], components: testAuthComponents });
};

const changeRole = (headers: Record<string, string>, body: unknown) => ({
  headers: { ...headers, 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

test('anonymous → 401 with WWW-Authenticate (@Roles implies @Protected)', async () => {
  const { app } = await createAdminWebTest();

  const response = await app.get('/admin/users').expectStatus(401);

  expect(response.headers.get('www-authenticate')).toBe('Bearer');

  await app.stop();
});

test('a session without the admin role → 403, no WWW-Authenticate', async () => {
  const { app, mocks } = await createAdminWebTest();

  const response = await app.get('/admin/users', { headers: asJoe }).expectStatus(403);

  expect(response.headers.get('www-authenticate')).toBeNull();
  expect(mocks.UserService.listUsers).not.toHaveBeenCalled();

  await app.stop();
});

test('the role check runs before validation: an invalid body from a non-admin is a 403', async () => {
  const { app, mocks } = await createAdminWebTest();

  await app.put('/admin/users/2/role', changeRole(asJoe, { role: 'superuser' })).expectStatus(403);

  expect(mocks.AuthService.changeRole).not.toHaveBeenCalled();

  await app.stop();
});

test('an admin lists the users', async () => {
  const { app, mocks } = await createAdminWebTest();

  mocks.UserService.listUsers.mockResolvedValue([{ id: 7, userName: 'joe', role: 'user' }]);

  await app.get('/admin/users', { headers: asAda }).expectStatus(200).expectJsonContains({ success: true });

  await app.stop();
});

test('PUT /admin/users/:id/role rejects an unknown role with 400', async () => {
  const { app, mocks } = await createAdminWebTest();

  await app.put('/admin/users/7/role', changeRole(asAda, { role: 'superuser' })).expectStatus(400);

  expect(mocks.AuthService.changeRole).not.toHaveBeenCalled();

  await app.stop();
});

test('PUT /admin/users/:id/role hands the service the acting admin, the target and the role', async () => {
  const { app, mocks } = await createAdminWebTest();

  mocks.AuthService.changeRole.mockResolvedValue({ id: 7, userName: 'joe', role: 'admin' });

  await app
    .put('/admin/users/7/role', changeRole(asAda, { role: 'admin' }))
    .expectStatus(200)
    .expectJsonContains({ success: true });

  expect(mocks.AuthService.changeRole).toHaveBeenCalledWith(1, 7, 'admin');

  await app.stop();
});
