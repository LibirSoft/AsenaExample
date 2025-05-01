import { UserRepository } from '../repository/UserRepository.ts';
import { logger } from '../../utils/logger.ts';
import type { CreteUserDto } from '../../middleWare/validator/CreateUserValidator.ts';
import { Inject } from '@asenajs/asena/ioc';
import { Service } from '@asenajs/asena/server';

@Service()
export class UserService {

  @Inject(UserRepository)
  private userRepository: UserRepository;

  public getHello(): string {
    return 'Hello World! Huuuray!!!';
  }

  public getUsers() {
    // logger.info('Getting users from the database');

    return this.userRepository.getUsers();
  }

  public async getUserById(id: number) {
    logger.info('Getting a user from the database by id');

    const users = this.userRepository.getUserById(id);

    if (users.length > 0) {
      return users[0];
    }

    return null;
  }

  public async getUserByFirstName(firstName: string, password: string) {
    logger.info('Getting a user from the database by first name');

    // TODO: hash password

    const users = this.userRepository.getUserByFirstName(firstName, password);

    if (users.length > 0) {
      return users[0];
    }

    return null;
  }

  public createUser(createUserDto: CreteUserDto) {
    console.log('createUserDto', createUserDto);

    this.userRepository.createUser(createUserDto);
  }

}
