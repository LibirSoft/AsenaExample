import { Controller } from '@asenajs/asena/decorators';
import { Get, Post } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { AuthService } from '../services/AuthService';
import type { PublicUser } from '../services/UserService';
import { AuthMiddleware } from '../middlewares/AuthMiddleware';
import { AuthRateLimiter } from '../middlewares/AuthRateLimiter';
import { LoginValidator, type LoginDto } from '../validators/LoginValidator';
import { SignupValidator, type SignupDto } from '../validators/SignupValidator';

@Controller({ path: '/auth', middlewares: [AuthRateLimiter] })
export class AuthController {
  @Inject(AuthService)
  private authService!: AuthService;

  @Post({ path: '/signup', validator: SignupValidator })
  public async signup(context: Context) {
    // getParseBody() returns the form validator's output: coerced (age is a
    // number), with unknown fields stripped — never the raw multipart body.
    const dto: SignupDto = await context.getParseBody();
    const user = await this.authService.signup(dto);

    return context.send({ success: true, message: 'User created successfully', user }, 201);
  }

  @Post({ path: '/login', validator: LoginValidator })
  public async login(context: Context) {
    const dto = await context.getBody<LoginDto>();
    const { token, user } = await this.authService.login(dto.userName, dto.password);

    return context.send({ success: true, token, user }, 200);
  }

  @Get({ path: '/me', middlewares: [AuthMiddleware] })
  public async me(context: Context) {
    return context.send({ success: true, user: context.getValue<PublicUser>('user') }, 200);
  }
}
