import { Component, Inject } from 'asena';
import { DatabaseService } from '../../db/DatabaseService.ts';
import { user } from '../../db/schema/userSchema.ts';
import { and, eq } from 'drizzle-orm';
import type { CreteUserDto } from '../../middleWare/validator/CreateUserValidator.ts';

@Component()
export class UserRepository {

  @Inject(DatabaseService)
  private db: DatabaseService;

  public getUsers() {
    return this.db.connection.select().from(user).execute();
  }

  public getUserById(id: number) {
    return this.db.connection.select().from(user).where(eq(user.id, id)).limit(1).execute();
  }

  public getUserByFirstName(userName: string, password: string) {
    return this.db.connection
      .select()
      .from(user)
      .where(and(eq(user.userName, userName), eq(user.password, password)))
      .limit(1)
      .execute();
  }

  public async createUser(createUserDto: CreteUserDto) {
    console.log('createUserDto', createUserDto);

    return this.db.connection
      .insert(user)
      .values({
        ...createUserDto,
        isActive: true,
      })
      .execute();
  }

}
