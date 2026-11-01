import { Context } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { USER_ROLES } from '../database/schemas/user.schema';

/** PUT /admin/users/:id/role — the target user and the new role. */
export class ChangeRoleContext extends Context.define({
  params: z.object({ id: z.coerce.number().int().positive() }),
  body: z.object({ role: z.enum(USER_ROLES) }),
}) {}
