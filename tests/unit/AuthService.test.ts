import { describe, test, expect } from 'bun:test';
import { mockComponent } from '@asenajs/asena/test';
import { isHttpException } from '@asenajs/asena/adapter';
import { AuthService } from '../../src/services/AuthService';
import type { UserRow } from '../../src/services/UserService';

/**
 * mockComponent builds AuthService with every injected collaborator
 * auto-mocked — including the AppAuth provider (`mocks.auth`), so hashing and
 * session calls are asserted, not executed.
 */
const createAuthService = () => mockComponent(AuthService);

const userRow: UserRow = {
  id: 5,
  userName: 'jane',
  firstName: 'Jane',
  lastName: 'Doe',
  age: 30,
  passwordHash: '$argon2id$stored-hash',
  profileImage: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const { passwordHash: _hash, ...publicUser } = userRow;

const signupDto = {
  userName: 'jane',
  firstName: 'Jane',
  lastName: 'Doe',
  age: 30,
  password: 'supersecret',
  file: new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' }),
};

const session = (id: string, createdAt: string) => ({
  user: { id: '5', userName: 'jane' },
  session: { id, userId: '5', createdAt: new Date(createdAt), expiresAt: new Date('2026-02-01T00:00:00Z') },
});

async function expectHttpError(promise: Promise<unknown>, status: number): Promise<void> {
  try {
    await promise;
    throw new Error('should have thrown');
  } catch (error) {
    expect(isHttpException(error as Error)).toBe(true);
    expect((error as { status?: number }).status).toBe(status);
  }
}

describe('AuthService', () => {
  test('signup stores the provider hash, the image and seeds a welcome todo', async () => {
    const { instance, mocks } = createAuthService();

    mocks.userService.userNameExists.mockResolvedValue(false);
    mocks.auth.hashPassword.mockResolvedValue('$argon2id$new-hash');
    mocks.fileStorageService.saveProfileImage.mockResolvedValue('/static/uploads/a.png');
    mocks.userService.createUser.mockResolvedValue({ ...publicUser, profileImage: '/static/uploads/a.png' });

    const user = await instance.signup(signupDto);

    // the plain-text password goes to the provider, only its hash is stored
    expect(mocks.auth.hashPassword).toHaveBeenCalledWith('supersecret');
    expect(mocks.userService.createUser.mock.calls[0][0].passwordHash).toBe('$argon2id$new-hash');
    expect('passwordHash' in user).toBe(false);

    expect(mocks.todoService.createTodo).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ title: 'Welcome to Asena!' }),
    );
  });

  test('signup rejects an already taken user name with 409', async () => {
    const { instance, mocks } = createAuthService();

    mocks.userService.userNameExists.mockResolvedValue(true);

    await expectHttpError(instance.signup(signupDto), 409);
    expect(mocks.userService.createUser).not.toHaveBeenCalled();
  });

  test('login with an unknown user throws 401 without opening a session', async () => {
    const { instance, mocks } = createAuthService();

    mocks.userService.getUserByUserName.mockResolvedValue(null);

    await expectHttpError(instance.login('nobody', 'whatever'), 401);
    expect(mocks.auth.createSession).not.toHaveBeenCalled();
  });

  test('login with a wrong password throws 401 without opening a session', async () => {
    const { instance, mocks } = createAuthService();

    mocks.userService.getUserByUserName.mockResolvedValue(userRow);
    mocks.auth.verifyPassword.mockResolvedValue(false);

    await expectHttpError(instance.login('jane', 'wrongpassword'), 401);
    expect(mocks.auth.verifyPassword).toHaveBeenCalledWith('wrongpassword', userRow.passwordHash);
    expect(mocks.auth.createSession).not.toHaveBeenCalled();
  });

  test('login opens a session holding a small user snapshot and returns its token', async () => {
    const { instance, mocks } = createAuthService();

    mocks.userService.getUserByUserName.mockResolvedValue(userRow);
    mocks.userService.toPublicUser.mockReturnValue(publicUser);
    mocks.auth.verifyPassword.mockResolvedValue(true);
    mocks.auth.createSession.mockResolvedValue({ token: 'opaque-token', session: {} });

    const { token, user } = await instance.login('jane', 'supersecret');

    expect(token).toBe('opaque-token');
    expect('passwordHash' in user).toBe(false);
    // asena-auth ids are strings; no password hash or profile data in the session
    expect(mocks.auth.createSession).toHaveBeenCalledWith({ id: '5', userName: 'jane' });
  });

  test('getProfile answers 401 when the session user no longer exists', async () => {
    const { instance, mocks } = createAuthService();

    mocks.userService.getUserById.mockResolvedValue(null);

    await expectHttpError(instance.getProfile(5), 401);
  });

  test('listSessions marks the current session and sorts newest first', async () => {
    const { instance, mocks } = createAuthService();

    mocks.auth.listUserSessions.mockResolvedValue([
      session('older', '2026-01-01T00:00:00Z'),
      session('newer', '2026-01-02T00:00:00Z'),
    ]);

    const sessions = await instance.listSessions(5, 'older');

    expect(mocks.auth.listUserSessions).toHaveBeenCalledWith('5');
    expect(sessions.map(({ id, current }) => ({ id, current }))).toEqual([
      { id: 'newer', current: false },
      { id: 'older', current: true },
    ]);
  });

  test('revokeSession refuses a session id the user does not own (404)', async () => {
    const { instance, mocks } = createAuthService();

    mocks.auth.listUserSessions.mockResolvedValue([session('mine', '2026-01-01T00:00:00Z')]);

    await expectHttpError(instance.revokeSession(5, 'someone-elses'), 404);
    expect(mocks.auth.revokeSessionById).not.toHaveBeenCalled();
  });

  test('revokeSession ends one of the user own sessions', async () => {
    const { instance, mocks } = createAuthService();

    mocks.auth.listUserSessions.mockResolvedValue([session('mine', '2026-01-01T00:00:00Z')]);

    await instance.revokeSession(5, 'mine');

    expect(mocks.auth.revokeSessionById).toHaveBeenCalledWith('mine');
  });
});
