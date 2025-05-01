import { Component } from '@asenajs/asena/server';
import { DatabaseService, type FakeDatabase } from '../../db/DatabaseService.ts';
import type { CreteUserDto } from '../../middleWare/validator/CreateUserValidator.ts';
import { Inject } from '@asenajs/asena/ioc';

@Component()
export class UserRepository {

  @Inject(DatabaseService, (service: DatabaseService) => service.connection)
  private db: FakeDatabase;

  public getUsers() {
    return this.db.users;
  }

  public getUserById(id: number) {
    return this.db.users.filter((user) => user.id === id);
  }

  public getUserByFirstName(userName: string, password: string) {
    return this.db.users.filter((user) => user.userName === userName && user.password === password);
  }

  public createUser(createUserDto: CreteUserDto) {
    return this.db.users.push({
      id: this.db.users.length + 1,
      ...createUserDto,
    });
  }

}
