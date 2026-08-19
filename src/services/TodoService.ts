import { Service } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { HttpException } from '@asenajs/asena/adapter';
import { TodoRepository } from '../repositories/TodoRepository';
import type { CreateTodoDto, UpdateTodoDto } from '../validators/TodoValidator';

export type TodoRow = Awaited<ReturnType<TodoRepository['findAllByUserId']>>[number];

@Service()
export class TodoService {
  @Inject('TodoRepository')
  private todoRepository!: TodoRepository;

  public getTodos(userId: number) {
    return this.todoRepository.findAllByUserId(userId);
  }

  public async getTodoById(id: number, userId: number): Promise<TodoRow> {
    const todo = await this.todoRepository.findOneByUserIdAndId(id, userId);

    if (!todo) {
      throw new HttpException(404, { success: false, message: `Todo ${id} not found` });
    }

    return todo;
  }

  public createTodo(userId: number, dto: CreateTodoDto) {
    return this.todoRepository.create({ ...dto, userId });
  }

  public async updateTodo(id: number, userId: number, dto: UpdateTodoDto): Promise<TodoRow> {
    const existing = await this.getTodoById(id, userId);

    // Drizzle rejects a .set() with only undefined values — treat an empty
    // update as a no-op instead of letting it surface as a 500.
    const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));

    if (Object.keys(changes).length === 0) {
      return existing;
    }

    // Existence was verified above — the row is guaranteed to be returned.
    return (await this.todoRepository.updateById(id, changes)) as TodoRow;
  }

  public async deleteTodo(id: number, userId: number): Promise<void> {
    await this.getTodoById(id, userId);
    await this.todoRepository.deleteById(id);
  }
}
