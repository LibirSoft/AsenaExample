import { Service } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { HttpException } from '@asenajs/asena/adapter';
import { Transaction } from '@asenajs/asena-drizzle';
import { sign, verify } from 'hono/jwt';
import { env } from '../env';
import { UserService, type PublicUser, type UserRow } from './UserService';
import { TodoService } from './TodoService';
import { FileStorageService } from './FileStorageService';
import type { SignupDto } from '../validators/SignupValidator';

export interface JwtPayload {
  sub: number;
  userName: string;
  exp: number;
  [key: string]: unknown;
}

const TOKEN_TTL_SECONDS = 60 * 60 * 12;

@Service()
export class AuthService {
  @Inject(UserService)
  private userService!: UserService;

  @Inject(TodoService)
  private todoService!: TodoService;

  @Inject(FileStorageService)
  private fileStorageService!: FileStorageService;

  /**
   * Creates the user and their welcome todo atomically. Both repository calls
   * join the transaction through AsyncLocalStorage — no tx parameter needed.
   */
  @Transaction()
  public async signup(dto: SignupDto): Promise<PublicUser> {
    if (await this.userService.userNameExists(dto.userName)) {
      throw new HttpException(409, {
        success: false,
        message: `User name '${dto.userName}' is already taken`,
      });
    }

    const passwordHash = await Bun.password.hash(dto.password, { algorithm: 'argon2id' });
    const profileImage =
      dto.file instanceof File && dto.file.size > 0
        ? await this.fileStorageService.saveProfileImage(dto.file)
        : null;

    const user = await this.userService.createUser({
      userName: dto.userName,
      firstName: dto.firstName,
      lastName: dto.lastName,
      age: dto.age,
      passwordHash,
      profileImage,
    });

    await this.todoService.createTodo(user.id, {
      title: 'Welcome to Asena!',
      description: 'Your first todo — created automatically during signup.',
      isCompleted: false,
    });

    return user;
  }

  public async login(userName: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const user = await this.userService.getUserByUserName(userName);

    if (!user || !(await Bun.password.verify(password, user.passwordHash))) {
      throw new HttpException(401, { success: false, message: 'Invalid credentials' });
    }

    return { token: await this.createToken(user), user: this.userService.toPublicUser(user) };
  }

  /**
   * Used by AuthMiddleware: verifies the bearer token and resolves it to a
   * live user, so deleted accounts lose access immediately.
   */
  public async getUserFromToken(token: string): Promise<PublicUser> {
    const payload = await this.verifyToken(token);
    const user = await this.userService.getUserById(payload.sub);

    if (!user) {
      throw new HttpException(401, { success: false, message: 'User no longer exists' });
    }

    return this.userService.toPublicUser(user);
  }

  public async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return (await verify(token, env.jwtSecret, 'HS256')) as JwtPayload;
    } catch {
      throw new HttpException(401, { success: false, message: 'Invalid or expired token' });
    }
  }

  private async createToken(user: UserRow): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      userName: user.userName,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
    };

    return sign(payload, env.jwtSecret, 'HS256');
  }
}
