import { Inject, Service } from '@asenajs/asena';
import { type CreateTodoDto, type Todo, TodoRepository } from '../repository/TodoRepository.ts';

@Service()
export class TodoService {

  @Inject(TodoRepository)
  private todoRepository: TodoRepository;

  public getTodosByUserId(userId: number) {
    return this.todoRepository.getTodosByUserId(userId);
  }

  public async getTodoByIdAndUserId(id: number, userId: number) {
    const todos = await this.todoRepository.getTodoByIdAndUserId(id, userId);

    return todos ? todos[0] : null;
  }

  public deleteTodoByIdAndUserId(id: number, userId: number) {
    return this.todoRepository.deleteTodoByIdAndUserId(id, userId);
  }

  public updateTodoById(todo: Todo) {
    return this.todoRepository.updateTodoById(todo);
  }

  public createTodo(userId: number, createTodoDto: CreateTodoDto) {
    return this.todoRepository.createTodo(userId, createTodoDto);
  }

}
