import { Component, Inject } from '../../../../Asena';
import { DatabaseService } from '../../db/DatabaseService.ts';
import { todo } from '../../db/schema/todoSchema.ts';
import { and, eq } from 'drizzle-orm';

export interface Todo {
  id: number;
  title: string;
  description: string;
  isCompleted: boolean;
  userId: number;
}

export interface CreateTodoDto {
  title: string;
  description: string;
  isCompleted: boolean;
}

@Component()
export class TodoRepository {

  @Inject(DatabaseService)
  private databaseService: DatabaseService;

  public async getTodosByUserId(userId: number) {
    return this.databaseService.connection.select().from(todo).where(eq(todo.userId, userId)).execute();
  }

  public async getTodoByIdAndUserId(id: number, userId: number) {
    return this.databaseService.connection
      .select()
      .from(todo)
      .where(and(eq(todo.id, id), eq(todo.userId, userId)))
      .limit(1)
      .execute();
  }

  public async deleteTodoByIdAndUserId(id: number, userId: number) {
    return this.databaseService.connection
      .delete(todo)
      .where(and(eq(todo.id, id), eq(todo.userId, userId)))
      .execute();
  }

  public async createTodo(userId: number, createTodoDto: CreateTodoDto) {
    return this.databaseService.connection
      .insert(todo)
      .values({
        ...createTodoDto,
        userId,
      })
      .execute();
  }

  public async updateTodoById(todoDto: Todo) {
    return this.databaseService.connection
      .update(todo)
      .set({ ...todoDto })
      .where(eq(todo.id, todoDto.id))
      .execute();
  }

}
