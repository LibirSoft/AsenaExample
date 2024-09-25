import { Component, Inject } from 'asena';
import { DatabaseService } from '../../db/DatabaseService.ts';
import type { CreteUserDto } from '../../middleWare/validator/CreateUserValidator.ts';

@Component()
export class UserRepository {

  @Inject(DatabaseService)
  private db: DatabaseService;

  public getUsers() {
    return this.db.connection.users;
  }

  public getUserById(id: number) {
    return this.db.connection.users.filter((user) => user.id === id);
  }

  public getUserByFirstName(userName: string, password: string) {
    return this.db.connection.users.filter((user) => user.userName === userName && user.password === password);
  }

  public createUser(createUserDto: CreteUserDto) {
    return this.db.connection.users.push({
      id: this.db.connection.users.length + 1,
      ...createUserDto,
    });
  }

}
