import type { User } from '../core/entitiy/User.ts';
import type { Todo } from '../core/repository/TodoRepository.ts';
import { logger } from '../utils/logger.ts';
import { Service } from '@asenajs/asena/server';
import { PostConstruct } from '@asenajs/asena/ioc';

export interface FakeDatabase {
  users: User[];
  todos: Todo[];
}

@Service()
export class DatabaseService {

  private db: FakeDatabase = { users: [], todos: [] };

  @PostConstruct()
  protected async onStart() {
    logger.info('Database service started');
  }

  public get connection() {
    return this.db;
  }

}
