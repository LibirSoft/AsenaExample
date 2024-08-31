import { Component } from 'asena/src/index.ts';
import { users } from '../entitiy/User.ts';

@Component({ name: 'UserRepo' })
export class UserRepository {

  public getUserByName(name: string) {
    return users.find((user) => user.name.includes(name));
  }

  public getUsers() {
    return users;
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
