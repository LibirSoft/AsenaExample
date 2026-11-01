import { describe, test, expect, mock } from 'bun:test';
import { mockComponent } from '@asenajs/asena/test';
import { isHttpException } from '@asenajs/asena/adapter';
import { UserService } from '../../src/services/UserService';
import type { UserRow } from '../../src/services/UserService';

const storedUser: UserRow = {
  id: 1,
  userName: 'jane',
  firstName: 'Jane',
  lastName: 'Doe',
  age: 30,
  passwordHash: 'argon2id$hash',
  profileImage: null,
  role: 'user',
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

/**
 * UserRepository is injected by name (@Inject('UserRepository')), so
 * mockComponent cannot derive a shape from it — provide an explicit double.
 */
function createUserRepositoryDouble() {
  return {
    findById: mock(async () => undefined),
    findByUserName: mock(async () => undefined as UserRow | undefined),
    existsBy: mock(async () => false),
    create: mock(async (_data: Omit<UserRow, 'id' | 'createdAt'>) => storedUser),
    findAll: mock(async () => [storedUser]),
    updateById: mock(async (_id: number, data: Partial<UserRow>): Promise<UserRow | undefined> => ({
      ...storedUser,
      ...data,
    })),
  };
}

describe('UserService', () => {
  test('createUser rejects a taken user name with 409', async () => {
    const userRepository = createUserRepositoryDouble();
    const { instance } = mockComponent(UserService, { overrides: { userRepository } });

    userRepository.findByUserName.mockResolvedValue(storedUser);

    try {
      await instance.createUser({ userName: 'jane', firstName: 'Jane', lastName: 'Doe', age: 30, passwordHash: 'h' });
      throw new Error('should have thrown');
    } catch (error) {
      expect(isHttpException(error as Error)).toBe(true);
      expect((error as { status?: number }).status).toBe(409);
    }
  });

  test('createUser stores the row but never returns the password hash', async () => {
    const userRepository = createUserRepositoryDouble();
    const { instance } = mockComponent(UserService, { overrides: { userRepository } });

    const user = await instance.createUser({
      userName: 'jane',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      passwordHash: 'argon2id$hash',
    });

    expect(userRepository.create).toHaveBeenCalledTimes(1);
    expect(user.id).toBe(1);
    expect('passwordHash' in user).toBe(false);
  });

  test('toPublicUser strips the password hash', () => {
    const { instance } = mockComponent(UserService, {
      overrides: { userRepository: createUserRepositoryDouble() },
    });

    const publicUser = instance.toPublicUser(storedUser);

    expect(publicUser).toEqual({
      id: 1,
      userName: 'jane',
      firstName: 'Jane',
      lastName: 'Doe',
      age: 30,
      profileImage: null,
      role: 'user',
      createdAt: storedUser.createdAt,
    });
  });

  test('listUsers never exposes password hashes', async () => {
    const { instance } = mockComponent(UserService, {
      overrides: { userRepository: createUserRepositoryDouble() },
    });

    const users = await instance.listUsers();

    expect(users).toHaveLength(1);
    expect('passwordHash' in users[0]!).toBe(false);
  });

  test('changeRole updates the role and answers 404 for an unknown user', async () => {
    const userRepository = createUserRepositoryDouble();
    const { instance } = mockComponent(UserService, { overrides: { userRepository } });

    expect((await instance.changeRole(1, 'admin')).role).toBe('admin');
    expect(userRepository.updateById).toHaveBeenCalledWith(1, { role: 'admin' });

    userRepository.updateById.mockResolvedValueOnce(undefined);

    try {
      await instance.changeRole(99, 'admin');
      throw new Error('should have thrown');
    } catch (error) {
      expect(isHttpException(error as Error)).toBe(true);
      expect((error as { status?: number }).status).toBe(404);
    }
  });
});
