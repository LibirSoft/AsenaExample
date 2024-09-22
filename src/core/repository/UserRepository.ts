import { Component, Inject } from 'asena';
import type { User } from '../entitiy/User.ts';
import { DatabaseService } from '../../db/DatabaseService.ts';
import { user } from '../../db/schema/userSchema.ts';
import { and, eq } from 'drizzle-orm';

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

  public getUserById(id: number) {
    return this.db.connection.select().from(user).where(eq(user.id, id)).execute();
  }

  public getUserByFirstName(firstName: string, password: string) {
    return this.db.connection
      .select()
      .from(user)
      .where(and(eq(user.firstName, firstName), eq(user.password, password)))
      .limit(1)
      .execute();
  }

}
