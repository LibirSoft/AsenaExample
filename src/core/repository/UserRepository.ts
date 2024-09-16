import { Component, Inject } from 'asena';
import { users } from '../entitiy/User.ts';
import { DatabaseService } from '../../db/DatabaseService.ts';
import { user } from '../../db/schema/userSchema.ts';

@Component()
export class UserRepository {

  @Inject(DatabaseService)
  private db: DatabaseService;

  public getUserByName(name: string) {
    return users.find((user) => user.name.includes(name));
  }

  public getUsers() {
    return this.db.connection.select().from(user).execute();
  }

  public addUser(user: any) {
    users.push(user);
  }

  public updateUser(name: string, user: any) {
    const index = users.findIndex((user) => user.name === name);

    users[index] = user;
  }

  public deleteUser(name: string) {
    const index = users.findIndex((user) => user.name === name);

    users.splice(index, 1);
  }

}
