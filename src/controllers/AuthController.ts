import { Protected, requireAuthSession } from '@asenajs/asena/auth';
import { Controller } from '@asenajs/asena/decorators';
import { Delete, Get, Post } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { applySessionCookie, clearSessionCookie } from '@asenajs/asena-auth';
import { type Context } from '@asenajs/hono-adapter';
import { AppAuth } from '../auth/AppAuth';
import { currentUser } from '../auth/currentUser';
import { AuthService } from '../services/AuthService';
import { AuthRateLimiter } from '../middlewares/AuthRateLimiter';
import { LoginValidator, type LoginDto } from '../validators/LoginValidator';
import { SignupValidator, type SignupDto } from '../validators/SignupValidator';
import { SessionIdContext } from '../validators/SessionValidator';

/**
 * signup/login are public; every other route carries a method-level
 * @Protected() mark. The provider is injected here only for the cookie
 * helpers and logout(), which work on the HTTP context — account and session
 * rules stay in AuthService.
 */
@Controller('/auth')
export class AuthController {
  @Inject(AuthService)
  private authService!: AuthService;

  @Inject(AppAuth)
  private auth!: AppAuth;

  // The brute-force limiter guards the credential endpoints only.
  @Post({ path: '/signup', validator: SignupValidator, middlewares: [AuthRateLimiter] })
  public async signup(context: Context) {
    // getParseBody() returns the form validator's output: coerced (age is a
    // number), with unknown fields stripped — never the raw multipart body.
    const dto: SignupDto = await context.getParseBody();
    const user = await this.authService.signup(dto);

    return context.send({ success: true, message: 'User created successfully', user }, 201);
  }

  /**
   * One session, two transports: browsers get the HttpOnly `asena_session`
   * cookie, API clients use the token from the body as a Bearer header.
   */
  @Post({ path: '/login', validator: LoginValidator, middlewares: [AuthRateLimiter] })
  public async login(context: Context) {
    const dto = await context.getBody<LoginDto>();
    const { token, user } = await this.authService.login(dto.userName, dto.password);

    await applySessionCookie(context, this.auth, token);

    return context.send({ success: true, token, user }, 200);
  }

  @Protected()
  @Get('/me')
  public async me(context: Context) {
    const user = await this.authService.getProfile(currentUser(context).id);

    return context.send({ success: true, user }, 200);
  }

  /** Ends the current session (Bearer token, else cookie) and clears the cookie. */
  @Protected()
  @Post('/logout')
  public async logout(context: Context) {
    await this.auth.logout(context);

    return context.send({ success: true, message: 'Logged out' }, 200);
  }

  @Protected()
  @Get('/sessions')
  public async sessions(context: Context) {
    const { session } = requireAuthSession(context);
    const sessions = await this.authService.listSessions(currentUser(context).id, session.id);

    return context.send({ success: true, sessions }, 200);
  }

  @Protected()
  @Delete('/sessions/:id')
  public async revokeSession(context: SessionIdContext) {
    await this.authService.revokeSession(currentUser(context).id, context.input.params.id);

    return context.send({ success: true, message: 'Session revoked' }, 200);
  }

  @Protected()
  @Post('/logout-all')
  public async logoutAll(context: Context) {
    await this.authService.revokeAllSessions(currentUser(context).id);
    await clearSessionCookie(context, this.auth);

    return context.send({ success: true, message: 'Logged out from every device' }, 200);
  }
}
