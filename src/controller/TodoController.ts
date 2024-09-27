import { type Context, Controller, Delete, Get, Inject, Post, Put } from '@asenajs/asena';
import { ClientErrorStatusCode, SuccessStatusCode } from '@asenajs/asena/lib/server/web/http';
import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';
import { TodoService } from '../core/service/TodoService.ts';
import type { User } from '../core/entitiy/User.ts';
import type { CreateTodoDto } from '../core/repository/TodoRepository.ts';
import { CreateTodoValidator } from '../middleWare/validator/CreateTodoValidator.ts';

@Controller({ path: '/todos', name: 'Todo Controller', middlewares: [AuthMiddleware] })
export class TodoController {

  @Inject(TodoService)
  private todoService: TodoService;

  @Get({ path: '/', description: 'Get all todos' })
  public async getTodos(context: Context) {
    const user = context.getValue<User>('user');

    const todos = await this.todoService.getTodosByUserId(user.id);

    return context.send(todos, SuccessStatusCode.OK);
  }

  @Get({ path: '/:id', description: 'Get a todo by id' })
  public async getTodo(context: Context) {
    const id = context.getParam('id');
    const user = context.getValue<User>('user');

    let todos;

    try {
      todos = await this.todoService.getTodoByIdAndUserId(Number(id), user.id);
    } catch (e) {
      return context.send({ success: false, message: 'Todo not found' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.send(todos, SuccessStatusCode.OK);
  }

  @Post({ path: '/', validator: CreateTodoValidator, description: 'Create a new todo' })
  public async create(context: Context) {
    const body = await context.getBody<CreateTodoDto>();

    const user = context.getValue<User>('user');

    try {
      await this.todoService.createTodo(user.id, body);
    } catch (e) {
      return context.send({ success: false, message: 'Todo not found' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.send({ success: true, message: 'Todo created successfully' }, SuccessStatusCode.OK);
  }

  @Put({ path: '/:id', validator: CreateTodoValidator, description: 'Update a todo by id' })
  public async update(context: Context) {
    const id = context.getParam('id');
    const body = await context.getBody<CreateTodoDto>();

    const user = context.getValue<User>('user');

    try {
      await this.todoService.updateTodoById({ id: Number(id), ...body, userId: user.id });
    } catch (e) {
      return context.send({ success: false, message: 'Todo not found' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.send({ success: true, message: 'Todo updated successfully' }, SuccessStatusCode.OK);
  }

  @Delete({ path: '/:id', description: 'Delete a todo by id' })
  public async delete(context: Context) {
    const id = context.getParam('id');
    const user = context.getValue<User>('user');

    try {
      await this.todoService.deleteTodoByIdAndUserId(Number(id), user.id);
    } catch (e) {
      return context.send({ success: false, message: 'Todo not found' }, ClientErrorStatusCode.BAD_REQUEST);
    }

    return context.send({ success: true, message: 'Todo deleted successfully' }, SuccessStatusCode.OK);
  }

}
