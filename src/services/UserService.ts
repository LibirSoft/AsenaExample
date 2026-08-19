import { Service } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { HttpException } from '@asenajs/asena/adapter';
import { UserRepository } from '../repositories/UserRepository';
import { users } from '../database/schemas/user.schema';

export type UserRow = typeof users.$inferSelect;
export type PublicUser = Omit<UserRow, 'passwordHash'>;

@Service()
export class UserService {
  @Inject('UserRepository')
  private userRepository!: UserRepository;

  public async getUserById(id: number): Promise<UserRow | null> {
    return (await this.userRepository.findById(id)) ?? null;
  }

  public async getUserByUserName(userName: string): Promise<UserRow | null> {
    return (await this.userRepository.findByUserName(userName)) ?? null;
  }

  public async userNameExists(userName: string): Promise<boolean> {
    return this.userRepository.existsBy('userName', userName);
  }

  public async createUser(data: typeof users.$inferInsert): Promise<PublicUser> {
    if (await this.userRepository.findByUserName(data.userName)) {
      throw new HttpException(409, {
        success: false,
        message: `User name '${data.userName}' is already taken`,
      });
    }

    return this.toPublicUser(await this.userRepository.create(data));
  }

  public toPublicUser(user: UserRow): PublicUser {
    const { passwordHash: _passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
