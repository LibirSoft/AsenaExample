import { describe, test, expect } from 'bun:test';
import { mockComponent } from '@asenajs/asena/test';
import { isHttpException } from '@asenajs/asena/adapter';
import { verify } from 'hono/jwt';
import { AuthService } from '../../src/services/AuthService';
import type { UserRow } from '../../src/services/UserService';
import { env } from '../../src/env';

const passwordHash = await Bun.password.hash('supersecret', { algorithm: 'argon2id' });

const userRow: UserRow = {
  id: 5,
  userName: 'jane',
  firstName: 'Jane',
  lastName: 'Doe',
  age: 30,
  passwordHash,
  profileImage: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

const signupDto = {
  userName: 'jane',
  firstName: 'Jane',
  lastName: 'Doe',
  age: 30,
  password: 'supersecret',
  file: new File([new Uint8Array([1, 2, 3])], 'avatar.png', { type: 'image/png' }),
};

describe('AuthService', () => {
  test('signup hashes the password, stores the image and seeds a welcome todo', async () => {
    const { instance, mocks } = mockComponent(AuthService);

    const { passwordHash: _hash, ...publicUser } = { ...userRow, profileImage: '/static/uploads/a.png' };

    mocks.userService.userNameExists.mockResolvedValue(false);
    mocks.fileStorageService.saveProfileImage.mockResolvedValue('/static/uploads/a.png');
    mocks.userService.createUser.mockResolvedValue(publicUser);

    const user = await instance.signup(signupDto);

    // password never stored or returned in plain text
    const stored = mocks.userService.createUser.mock.calls[0][0];
    expect(stored.passwordHash).not.toBe('supersecret');
    expect(await Bun.password.verify('supersecret', stored.passwordHash)).toBe(true);
    expect('passwordHash' in user).toBe(false);

    expect(mocks.todoService.createTodo).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ title: 'Welcome to Asena!' }),
    );
  });

  test('signup rejects an already taken user name with 409', async () => {
    const { instance, mocks } = mockComponent(AuthService);

    mocks.userService.userNameExists.mockResolvedValue(true);

    try {
      await instance.signup(signupDto);
      throw new Error('should have thrown');
    } catch (error) {
      expect(isHttpException(error as Error)).toBe(true);
      expect((error as { status?: number }).status).toBe(409);
      expect(mocks.userService.createUser).not.toHaveBeenCalled();
    }
  });

  test('login with wrong credentials throws 401', async () => {
    const { instance, mocks } = mockComponent(AuthService);

    mocks.userService.getUserByUserName.mockResolvedValue(null);

    try {
      await instance.login('jane', 'wrongpassword');
      throw new Error('should have thrown');
    } catch (error) {
      expect(isHttpException(error as Error)).toBe(true);
      expect((error as { status?: number }).status).toBe(401);
    }
  });

  test('login returns a verifiable JWT for the user', async () => {
    const { instance, mocks } = mockComponent(AuthService);

    const { passwordHash: _hash, ...publicUser } = userRow;

    mocks.userService.getUserByUserName.mockResolvedValue(userRow);
    mocks.userService.toPublicUser.mockReturnValue(publicUser);

    const { token, user } = await instance.login('jane', 'supersecret');

    expect(user.id).toBe(5);
    expect('passwordHash' in user).toBe(false);

    const payload = (await verify(token, env.jwtSecret, 'HS256')) as { sub: number; userName: string };
    expect(payload.sub).toBe(5);
    expect(payload.userName).toBe('jane');
  });

  test('verifyToken rejects a malformed token with 401', async () => {
    const { instance } = mockComponent(AuthService);

    try {
      await instance.verifyToken('not-a-jwt');
      throw new Error('should have thrown');
    } catch (error) {
      expect(isHttpException(error as Error)).toBe(true);
      expect((error as { status?: number }).status).toBe(401);
    }
  });
});
