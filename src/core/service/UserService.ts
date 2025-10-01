import type { UserRepository, CreateUserDto } from '../repository/UserRepository.ts';
import { logger } from '../../utils/logger.ts';
import { Inject } from '@asenajs/asena/ioc';
import { Service } from '@asenajs/asena/server';
import type { User } from '../schemas/User.ts';

@Service('UserService')
export class UserService {

  @Inject('UserRepository')
  private userRepository: UserRepository;

  public async getUsers(): Promise<User[]> {
    logger.info('Getting users from the database');

    return await this.userRepository.getUsers();
  }

  public async getUserById(id: string): Promise<User | null> {
    logger.info('Getting a user from the database by id');

    return await this.userRepository.getUserById(id);
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    logger.info('Getting a user from the database by email');

    return await this.userRepository.getUserByEmail(email);
  }

  public async getUserByName(name: string): Promise<User[]> {
    logger.info('Getting users from the database by name');

    return await this.userRepository.getUserByName(name);
  }

  public async createUser(createUserDto: CreateUserDto): Promise<User> {
    logger.info('Creating a new user in the database');

    return await this.userRepository.createUser(createUserDto);
  }

}
