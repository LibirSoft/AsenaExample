import { Inject, Service } from 'asena/src';
import { UserRepository } from '../repository/UserRepository.ts';
import { logger } from '../../utils/logger.ts';
import type { User } from '../entity/User.ts';

@Service({ name: 'UserService' })
export class UserService {

  @Inject(UserRepository)
  private userRepository: UserRepository;

  public getUsers() {
    logger.info('Getting users from the database');

    return this.userRepository.getUsers();
  }

  public addUser(user: User) {
    logger.info('Adding a user to the database');

    this.userRepository.addUser(user);
  }

  public getUserByName(name: string) {
    logger.info('Getting a user from the database');

    return this.userRepository.getUserByName(name);
  }

  public updateUser(name: string, user: User) {
    logger.info('Updating a user in the database');

    this.userRepository.updateUser(name, user);
  }

  public deleteUser(name: string) {
    logger.info('Deleting a user from the database');

    this.userRepository.deleteUser(name);
  }

}
