import { ServerService } from 'asena';
import { AsenaService } from 'asena/src/services';
import type { User } from '../core/entitiy/User.ts';
import type { Todo } from '../core/repository/TodoRepository.ts';
import { logger } from '../utils/logger.ts';

export interface FakeDatabase {
  users: User[];
  todos: Todo[];
}

@ServerService()
export class DatabaseService extends AsenaService {

  private db: FakeDatabase = { users: [], todos: [] };

  protected async onStart() {
    logger.info('Database service started');
  }

  public get connection() {
    return this.db;
  }

}
