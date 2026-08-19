import { Controller } from '@asenajs/asena/decorators';
import { Delete, Get, Post, Put } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { TodoService } from '../services/TodoService';
import type { PublicUser } from '../services/UserService';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import {
  CreateTodoValidator,
  TodoIdValidator,
  UpdateTodoValidator,
  type CreateTodoDto,
  type UpdateTodoDto,
} from '../validators/TodoValidator';

@Controller({ path: '/todos', middlewares: [AuthMiddleware] })
export class TodoController {
  @Inject(TodoService)
  private todoService!: TodoService;

  @Get('/')
  public async list(context: Context) {
    const user = context.getValue<PublicUser>('user');
    return context.send(await this.todoService.getTodos(user.id), 200);
  }

  @Get({ path: '/:id', validator: TodoIdValidator })
  public async getById(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const todo = await this.todoService.getTodoById(Number(context.getParam('id')), user.id);
    return context.send(todo, 200);
  }

  @Post({ path: '/', validator: CreateTodoValidator })
  public async create(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const dto = await context.getBody<CreateTodoDto>();
    return context.send(await this.todoService.createTodo(user.id, dto), 201);
  }

  @Put({ path: '/:id', validator: UpdateTodoValidator })
  public async update(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const dto = await context.getBody<UpdateTodoDto>();
    return context.send(await this.todoService.updateTodo(Number(context.getParam('id')), user.id, dto), 200);
  }

  @Delete({ path: '/:id', validator: TodoIdValidator })
  public async remove(context: Context) {
    const user = context.getValue<PublicUser>('user');
    await this.todoService.deleteTodo(Number(context.getParam('id')), user.id);
    return context.send({ success: true, message: 'Todo deleted successfully' }, 200);
  }
}
