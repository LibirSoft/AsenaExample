import { Service } from '@asenajs/asena/decorators';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { HttpException } from '@asenajs/asena/adapter';
import { Transaction } from '@asenajs/asena-drizzle';
import { AppAuth } from '../auth/AppAuth';
import { UserService, type PublicUser } from './UserService';
import { TodoService } from './TodoService';
import { FileStorageService } from './FileStorageService';
import type { SignupDto } from '../validators/SignupValidator';

export interface SessionInfo {
  /** The session's public id (SHA-256 of its token) — safe to show, never usable as a token. */
  id: string;
  createdAt: Date;
  expiresAt: Date;
  /** True for the session that made this request. */
  current: boolean;
}

/**
 * Account and session rules. Token mechanics (issuing, hashing, expiry,
 * revocation) belong to the AppAuth provider; this service decides WHO gets a
 * session and which sessions a user may see or end.
 */
@Service()
export class AuthService {
  @Inject(UserService)
  private userService!: UserService;

  @Inject(TodoService)
  private todoService!: TodoService;

  @Inject(FileStorageService)
  private fileStorageService!: FileStorageService;

  @Inject(AppAuth)
  private auth!: AppAuth;

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

    const passwordHash = await this.auth.hashPassword(dto.password);
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

  /** Checks the credentials and opens a new session; returns its token once — it is never stored. */
  public async login(userName: string, password: string): Promise<{ token: string; user: PublicUser }> {
    const user = await this.userService.getUserByUserName(userName);

    if (!user || !(await this.auth.verifyPassword(password, user.passwordHash))) {
      throw new HttpException(401, { success: false, message: 'Invalid credentials' });
    }

    // The session stores a small, plain snapshot; handlers read it on every request.
    const { token } = await this.auth.createSession({ id: String(user.id), userName: user.userName });

    return { token, user: this.userService.toPublicUser(user) };
  }

  /** The live user behind a session — fresh data, not the session snapshot. */
  public async getProfile(userId: number): Promise<PublicUser> {
    const user = await this.userService.getUserById(userId);

    if (!user) {
      throw new HttpException(401, { success: false, message: 'User no longer exists' });
    }

    return this.userService.toPublicUser(user);
  }

  /** The user's active sessions ("signed-in devices"), newest first. */
  public async listSessions(userId: number, currentSessionId: string): Promise<SessionInfo[]> {
    const sessions = await this.auth.listUserSessions(String(userId));

    return sessions
      .map(({ session }) => ({
        id: session.id,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        current: session.id === currentSessionId,
      }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Ends one of the user's own sessions. The id comes from the client, so it is
   * untrusted: revokeSessionById() would end ANY session, ownership is checked
   * first — someone else's session id is indistinguishable from an unknown one.
   */
  public async revokeSession(userId: number, sessionId: string): Promise<void> {
    const own = await this.auth.listUserSessions(String(userId));

    if (!own.some(({ session }) => session.id === sessionId)) {
      throw new HttpException(404, { success: false, message: 'Session not found' });
    }

    await this.auth.revokeSessionById(sessionId);
  }

  /** Signs the user out everywhere — every device, the current one included. */
  public async revokeAllSessions(userId: number): Promise<void> {
    await this.auth.revokeUserSessions(String(userId));
  }
}
