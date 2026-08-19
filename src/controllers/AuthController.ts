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
    // getBody() returns the validator output only for json validators; for a
    // form validator the parsed result lives in req.valid('form') on hono.
    const dto = context.req.valid('form') as SignupDto;
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
