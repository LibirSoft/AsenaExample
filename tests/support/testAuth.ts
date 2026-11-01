import { authComponents } from '@asenajs/asena-auth';
import { TestAuth, TestAuthProvider } from '@asenajs/asena-auth/testing';
import type { AppUser } from '../../src/auth/AppAuth';

/**
 * Web-slice auth: the `x-test-user` header names one of these users and that
 * user IS the session — no signup, login or session store involved. The real
 * AuthGuard still enforces @Protected, so a request without the header is
 * the same 401 a production client gets.
 *
 * TestAuthProvider trusts a request header: it exists only under the
 * /testing subpath and must never be registered in the application.
 */
@TestAuth({
  users: {
    joe: { id: '7', userName: 'joe' },
  },
})
export class AppTestAuth extends TestAuthProvider<AppUser> {}

/** createWebTest has no `imports` — package components go into `components`. */
export const testAuthComponents = [...authComponents, AppTestAuth];

export const asJoe = { 'x-test-user': 'joe' };
