import { describe, test, expect, mock } from 'bun:test';
import { DrizzleSessionStore } from '../../src/auth/DrizzleSessionStore';
import type { SessionRepository } from '../../src/repositories/SessionRepository';

/**
 * The store is a plain class (no decorators): AppAuth builds it in onStart()
 * with its injected repository, so a unit test just hands it a stub.
 * Its job is the mapping between asena-auth's StoredSession (string user id,
 * epoch milliseconds) and the sessions row (integer FK, timestamps).
 */
const row = {
  id: 'a'.repeat(64),
  userId: 5,
  user: { id: '5', userName: 'jane' },
  createdAt: new Date(1_000),
  expiresAt: new Date(2_000),
};

const stored = {
  id: 'a'.repeat(64),
  userId: '5',
  user: { id: '5', userName: 'jane' },
  createdAt: 1_000,
  expiresAt: 2_000,
};

function createRepository() {
  return {
    create: mock(async () => row),
    findById: mock(async (): Promise<typeof row | null> => row),
    findAllByUserId: mock(async () => [row]),
    deleteById: mock(async () => true),
    deleteAllByUserId: mock(async () => 1),
    deleteExpired: mock(async () => 0),
    updateById: mock(async () => row),
  };
}

const createStore = (repository: ReturnType<typeof createRepository>) =>
  new DrizzleSessionStore(repository as unknown as SessionRepository);

describe('DrizzleSessionStore', () => {
  test('create() converts to the row shape and sweeps expired rows first', async () => {
    const repository = createRepository();

    await createStore(repository).create(stored);

    expect(repository.deleteExpired).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(row);
  });

  test('get() converts back to a StoredSession, null when missing', async () => {
    const repository = createRepository();
    const store = createStore(repository);

    expect(await store.get(row.id)).toEqual(stored);

    repository.findById.mockResolvedValueOnce(null);
    expect(await store.get('missing')).toBeNull();
  });

  test('listByUser(), deleteByUser() and touch() address rows by numeric user id / Date', async () => {
    const repository = createRepository();
    const store = createStore(repository);

    expect(await store.listByUser('5')).toEqual([stored]);
    expect(repository.findAllByUserId).toHaveBeenCalledWith(5);

    await store.deleteByUser('5');
    expect(repository.deleteAllByUserId).toHaveBeenCalledWith(5);

    await store.touch(row.id, 3_000);
    expect(repository.updateById).toHaveBeenCalledWith(row.id, { expiresAt: new Date(3_000) });
  });
});
