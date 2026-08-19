import { Repository, BaseRepository } from '@asenajs/asena-drizzle';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { and, eq } from 'drizzle-orm';
import { todos } from '../database/schemas/todo.schema';
import type Schemas from '../database/schemas';

@Repository({
  table: todos,
  databaseService: 'MainDatabase',
  name: 'TodoRepository',
})
export class TodoRepository extends BaseRepository<typeof todos, BunSQLDatabase<typeof Schemas>> {
  public findAllByUserId(userId: number) {
    return this.findAll(eq(todos.userId, userId));
  }

  public findOneByUserIdAndId(id: number, userId: number) {
    return this.findOne(and(eq(todos.id, id), eq(todos.userId, userId)));
  }
}
