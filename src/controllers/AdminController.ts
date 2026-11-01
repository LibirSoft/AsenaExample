import { Roles } from '@asenajs/asena/auth';
import { Controller } from '@asenajs/asena/decorators';
import { Get, Put } from '@asenajs/asena/decorators/http';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { type Context } from '@asenajs/hono-adapter';
import { currentUser } from '../auth/currentUser';
import { AuthService } from '../services/AuthService';
import { UserService } from '../services/UserService';
import { ChangeRoleContext } from '../validators/AdminValidator';

/**
 * Administration. @Roles('admin') implies @Protected: no session → 401 with
 * WWW-Authenticate, a session without the role → 403. The guard reads the
 * roles of the session snapshot (AppUser.roles), set at login.
 */
@Roles('admin')
@Controller({ path: '/admin', description: 'Administration — requires the admin role' })
export class AdminController {
  @Inject(UserService)
  private userService!: UserService;

  @Inject(AuthService)
  private authService!: AuthService;

  @Get({ path: '/users', description: 'List every user with their role' })
  public async listUsers(context: Context) {
    return context.send({ success: true, users: await this.userService.listUsers() }, 200);
  }

  @Put({ path: '/users/:id/role', description: "Change a user's role; ends all of their sessions" })
  public async changeRole(context: ChangeRoleContext) {
    const { params, body } = context.input;
    const user = await this.authService.changeRole(currentUser(context).id, params.id, body.role);

    return context.send({ success: true, user }, 200);
  }
}
