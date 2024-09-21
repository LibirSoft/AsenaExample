import { Inject, Service } from 'asena';
import { UserRepository } from '../repository/UserRepository.ts';
import { logger } from '../../utils/logger.ts';
import type { User } from '../entitiy/User.ts';

@Service()
export class UserService {

  @Inject(UserRepository)
  private userRepository: UserRepository;

  public getHello(): string {
    return 'Hello World! Huuuray!!!';
  }

  public getUsers() {
    logger.info('Getting users from the database');

    return this.userRepository.getUsers();
  }

  public async addUser(user: User) {
    logger.info('Adding a user to the database');

    await this.userRepository.addUser(user);
  }

}
