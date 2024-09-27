import { ServerService } from '@asenajs/asena';
import type { User } from '../core/entitiy/User.ts';
import type { Todo } from '../core/repository/TodoRepository.ts';
import { logger } from '../utils/logger.ts';
import {AsenaService} from "@asenajs/asena/dist/lib/services";

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
