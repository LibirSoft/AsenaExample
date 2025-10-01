import { AuthMiddleware } from '../middleWare/auth/AuthMiddleware.ts';
import type { TodoService } from '../core/service/TodoService.ts';
import type { User } from '../core/schemas/User.ts';
import type { CreateTodoDto, UpdateTodoDto } from '../core/repository/TodoRepository.ts';
import { CreateTodoValidator } from '../middleWare/validator/CreateTodoValidator.ts';
import { UpdateTodoValidator } from '../middleWare/validator/UpdateTodoValidator.ts';
import { Controller } from '@asenajs/asena/server';
import { Delete, Get, Post, Put } from '@asenajs/asena/web';
import { ClientErrorStatusCode, ServerErrorStatusCode, SuccessStatusCode } from '@asenajs/asena/web-types';
import { Inject } from '@asenajs/asena/ioc';
import type { Context } from '@asenajs/hono-adapter';

@Controller({ path: '/todos', name: 'TodoController', middlewares: [AuthMiddleware] })
export class TodoController {

  @Inject('TodoService')
  private todoService: TodoService;

  @Get({ path: '/', description: 'Get all todos' })
  public async getTodos(context: Context) {
    const user = context.getValue<User>('user');

    try {
      const todos = await this.todoService.getTodosByUserId(user.id);

      return context.send({ success: true, data: todos }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send(
        { success: false, message: 'Failed to fetch todos' },
        ServerErrorStatusCode.InternalServerError,
      );
    }
  }

  @Get({ path: '/:id', description: 'Get a todo by id' })
  public async getTodo(context: Context) {
    const id = context.getParam('id');
    const user = context.getValue<User>('user');

    try {
      const todo = await this.todoService.getTodoByIdAndUserId(id, user.id);

      if (!todo) {
        return context.send({ success: false, message: 'Todo not found' }, ClientErrorStatusCode.NotFound);
      }

      return context.send({ success: true, data: todo }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to fetch todo' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Post({ path: '/', validator: CreateTodoValidator, description: 'Create a new todo' })
  public async create(context: Context) {
    const body = await context.getBody<CreateTodoDto>();
    const user = context.getValue<User>('user');

    try {
      const todo = await this.todoService.createTodo(user.id, body);

      return context.send(
        { success: true, data: todo, message: 'Todo created successfully' },
        SuccessStatusCode.Created,
      );
    } catch (e) {
      return context.send({ success: false, message: 'Failed to create todo' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Put({ path: '/:id', validator: UpdateTodoValidator, description: 'Update a todo by id' })
  public async update(context: Context) {
    const id = context.getParam('id');
    const body = await context.getBody<UpdateTodoDto>();
    const user = context.getValue<User>('user');

    try {
      const todo = await this.todoService.updateTodoById(id, user.id, body);

      if (!todo) {
        return context.send(
          { success: false, message: 'Todo not found or unauthorized' },
          ClientErrorStatusCode.NotFound,
        );
      }

      return context.send({ success: true, data: todo, message: 'Todo updated successfully' }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to update todo' }, ClientErrorStatusCode.BadRequest);
    }
  }

  @Delete({ path: '/:id', description: 'Delete a todo by id' })
  public async delete(context: Context) {
    const id = context.getParam('id');
    const user = context.getValue<User>('user');

    try {
      const deleted = await this.todoService.deleteTodoByIdAndUserId(id, user.id);

      if (!deleted) {
        return context.send(
          { success: false, message: 'Todo not found or unauthorized' },
          ClientErrorStatusCode.NotFound,
        );
      }

      return context.send({ success: true, message: 'Todo deleted successfully' }, SuccessStatusCode.Ok);
    } catch (e) {
      return context.send({ success: false, message: 'Failed to delete todo' }, ClientErrorStatusCode.BadRequest);
    }
  }

}
