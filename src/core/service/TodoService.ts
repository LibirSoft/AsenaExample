import { Service } from '@asenajs/asena/server';
import type { TodoRepository, CreateTodoDto, UpdateTodoDto } from '../repository/TodoRepository.ts';
import { Inject } from '@asenajs/asena/ioc';
import type { Todo } from '../schemas/Todo.ts';

@Service("TodoService")
export class TodoService {

  @Inject('TodoRepository')
  private todoRepository: TodoRepository;

  public async getTodosByUserId(userId: string): Promise<Todo[]> {
    return await this.todoRepository.getTodosByUserId(userId);
  }

  public async getTodoByIdAndUserId(id: string, userId: string): Promise<Todo | null> {
    return await this.todoRepository.getTodoByIdAndUserId(id, userId);
  }

  public async deleteTodoByIdAndUserId(id: string, userId: string): Promise<boolean> {
    return await this.todoRepository.deleteTodoByIdAndUserId(id, userId);
  }

  public async updateTodoById(id: string, userId: string, updateTodoDto: UpdateTodoDto): Promise<Todo | null> {
    return await this.todoRepository.updateTodoById(id, userId, updateTodoDto);
  }

  public async createTodo(userId: string, createTodoDto: CreateTodoDto): Promise<Todo> {
    return await this.todoRepository.createTodo(userId, createTodoDto);
  }

}
