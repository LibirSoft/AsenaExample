import { BaseRepository, Repository } from '@asenajs/asena-drizzle';
import { TodoSchema, type Todo, type TodoSchemaType, type NewTodo } from '../schemas/Todo.ts';
import { and, desc, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

export interface CreateTodoDto {
  title: string;
  description: string;
  isCompleted?: boolean;
}

export interface UpdateTodoDto {
  title?: string;
  description?: string;
  isCompleted?: boolean;
}

@Repository({
  databaseService: 'DatabaseService',
  table: TodoSchema,
  name: 'TodoRepository',
})
export class TodoRepository extends BaseRepository<TodoSchemaType, BunSQLDatabase> {

  public async getTodosByUserId(userId: string): Promise<Todo[]> {
    return this.db!.select().from(TodoSchema).where(eq(TodoSchema.userId, userId)).orderBy(desc(TodoSchema.createdAt));
  }

  public async getTodoByIdAndUserId(id: string, userId: string): Promise<Todo | null> {
    const [todo] = await this.db!.select()
      .from(TodoSchema)
      .where(and(eq(TodoSchema.id, id), eq(TodoSchema.userId, userId)))
      .limit(1);

    return todo || null;
  }

  public async deleteTodoByIdAndUserId(id: string, userId: string): Promise<boolean> {
    const result = await this.db!.delete(TodoSchema)
      .where(and(eq(TodoSchema.id, id), eq(TodoSchema.userId, userId)))
      .returning();

    return result.length > 0;
  }

  public async createTodo(userId: string, createTodoDto: CreateTodoDto): Promise<Todo> {
    const newTodo: NewTodo = {
      userId,
      title: createTodoDto.title,
      description: createTodoDto.description,
      isCompleted: createTodoDto.isCompleted ?? false,
    };

    const [todo] = await this.db!.insert(TodoSchema).values(newTodo).returning();

    return todo;
  }

  public async updateTodoById(id: string, userId: string, updateTodoDto: UpdateTodoDto): Promise<Todo | null> {
    const [todo] = await this.db!.update(TodoSchema)
      .set({
        ...updateTodoDto,
        updatedAt: new Date(),
      })
      .where(and(eq(TodoSchema.id, id), eq(TodoSchema.userId, userId)))
      .returning();

    return todo || null;
  }

}
