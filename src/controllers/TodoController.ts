import { Protected } from '@asenajs/asena/auth';
import { Controller } from '@asenajs/asena/decorators';
import { Delete, Get, Post, Put } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { currentUser } from '../auth/currentUser';
import { TodoService } from '../services/TodoService';
import {
  CreateTodoValidator,
  TodoIdContext,
  UpdateTodoContext,
  type CreateTodoDto,
} from '../validators/TodoValidator';

/**
 * Every route requires a session: the class-level @Protected() mark is
 * enforced by asena-auth's guard before validation runs — an anonymous
 * request is a 401 even when its body is invalid.
 */
@Protected()
@Controller('/todos')
export class TodoController {
  @Inject(TodoService)
  private todoService!: TodoService;

  @Get('/')
  public async list(context: Context) {
    const user = currentUser(context);
    return context.send(await this.todoService.getTodos(user.id), 200);
  }

  // Route context contract: :id is validated and coerced before the handler runs.
  @Get('/:id')
  public async getById(context: TodoIdContext) {
    const user = currentUser(context);
    const todo = await this.todoService.getTodoById(context.input.params.id, user.id);
    return context.send(todo, 200);
  }

  // Validator class: keeps its response() schemas in the OpenAPI spec.
  @Post({ path: '/', validator: CreateTodoValidator })
  public async create(context: Context) {
    const user = currentUser(context);
    const dto = await context.getBody<CreateTodoDto>();
    return context.send(await this.todoService.createTodo(user.id, dto), 201);
  }

  @Put('/:id')
  public async update(context: UpdateTodoContext) {
    const user = currentUser(context);
    const { params, body } = context.input;
    return context.send(await this.todoService.updateTodo(params.id, user.id, body), 200);
  }

  @Delete('/:id')
  public async remove(context: TodoIdContext) {
    const user = currentUser(context);
    await this.todoService.deleteTodo(context.input.params.id, user.id);
    return context.send({ success: true, message: 'Todo deleted successfully' }, 200);
  }
}
