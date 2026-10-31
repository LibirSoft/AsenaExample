import { Controller } from '@asenajs/asena/decorators';
import { Delete, Get, Post, Put } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { TodoService } from '../services/TodoService';
import type { PublicUser } from '../services/UserService';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import {
  CreateTodoValidator,
  TodoIdContext,
  UpdateTodoContext,
  type CreateTodoDto,
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

  // Route context contract: :id is validated and coerced before the handler runs.
  @Get('/:id')
  public async getById(context: TodoIdContext) {
    const user = context.getValue<PublicUser>('user');
    const todo = await this.todoService.getTodoById(context.input.params.id, user.id);
    return context.send(todo, 200);
  }

  // Validator class: keeps its response() schemas in the OpenAPI spec.
  @Post({ path: '/', validator: CreateTodoValidator })
  public async create(context: Context) {
    const user = context.getValue<PublicUser>('user');
    const dto = await context.getBody<CreateTodoDto>();
    return context.send(await this.todoService.createTodo(user.id, dto), 201);
  }

  @Put('/:id')
  public async update(context: UpdateTodoContext) {
    const user = context.getValue<PublicUser>('user');
    const { params, body } = context.input;
    return context.send(await this.todoService.updateTodo(params.id, user.id, body), 200);
  }

  @Delete('/:id')
  public async remove(context: TodoIdContext) {
    const user = context.getValue<PublicUser>('user');
    await this.todoService.deleteTodo(context.input.params.id, user.id);
    return context.send({ success: true, message: 'Todo deleted successfully' }, 200);
  }
}
