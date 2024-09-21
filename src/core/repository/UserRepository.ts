import { Component, Inject } from 'asena';
import type { User } from '../entitiy/User.ts';
import { DatabaseService } from '../../db/DatabaseService.ts';
import { user } from '../../db/schema/userSchema.ts';

@Component()
export class UserRepository {

  @Inject(DatabaseService)
  private db: DatabaseService;

  public getUsers() {
    return this.db.connection.select().from(user).execute();
  }

  public async addUser(userDto: User) {
    await this.db.connection
      .insert(user)
      .values({ ...userDto, isActive: true })
      .execute();
  }

}
