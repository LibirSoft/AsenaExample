import { describe, test, expect, mock } from 'bun:test';
import { mockComponent } from '@asenajs/asena/test';
import { isHttpException } from '@asenajs/asena/adapter';
import { TodoService, type TodoRow } from '../../src/services/TodoService';

const todo: TodoRow = {
  id: 7,
  title: 'Buy milk',
  description: null,
  isCompleted: false,
  userId: 1,
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

/** Explicit double — TodoRepository is injected by name, not by class. */
function createTodoRepositoryDouble() {
  return {
    findAllByUserId: mock(async () => [] as TodoRow[]),
    findOneByUserIdAndId: mock(async () => undefined as TodoRow | undefined),
    create: mock(async (data: Omit<TodoRow, 'id' | 'createdAt'>) => ({ id: 8, createdAt: new Date(), ...data })),
    updateById: mock(async (id: number, data: Partial<TodoRow>) => ({ ...todo, id, ...data })),
    deleteById: mock(async () => undefined),
  };
}

describe('TodoService', () => {
  test('getTodoById throws 404 when the todo does not exist (or is owned by someone else)', async () => {
    const todoRepository = createTodoRepositoryDouble();
    const { instance } = mockComponent(TodoService, { overrides: { todoRepository } });

    todoRepository.findOneByUserIdAndId.mockResolvedValue(undefined);

    try {
      await instance.getTodoById(999, 1);
      throw new Error('should have thrown');
    } catch (error) {
      expect(isHttpException(error as Error)).toBe(true);
      expect((error as { status?: number }).status).toBe(404);
    }
  });

  test('updateTodo is a no-op when the payload has no fields', async () => {
    const todoRepository = createTodoRepositoryDouble();
    const { instance } = mockComponent(TodoService, { overrides: { todoRepository } });

    todoRepository.findOneByUserIdAndId.mockResolvedValue(todo);

    const result = await instance.updateTodo(7, 1, {});

    expect(result).toEqual(todo);
    expect(todoRepository.updateById).not.toHaveBeenCalled();
  });

  test('updateTodo applies only the provided fields', async () => {
    const todoRepository = createTodoRepositoryDouble();
    const { instance } = mockComponent(TodoService, { overrides: { todoRepository } });

    todoRepository.findOneByUserIdAndId.mockResolvedValue(todo);
    todoRepository.updateById.mockResolvedValue({ ...todo, isCompleted: true });

    await instance.updateTodo(7, 1, { isCompleted: true });

    expect(todoRepository.updateById).toHaveBeenCalledWith(7, { isCompleted: true });
  });

  test('deleteTodo verifies ownership before deleting', async () => {
    const todoRepository = createTodoRepositoryDouble();
    const { instance } = mockComponent(TodoService, { overrides: { todoRepository } });

    todoRepository.findOneByUserIdAndId.mockResolvedValue(todo);

    await instance.deleteTodo(7, 1);

    expect(todoRepository.deleteById).toHaveBeenCalledWith(7);
  });
});
