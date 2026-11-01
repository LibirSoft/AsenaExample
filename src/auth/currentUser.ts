import { requireAuthSession } from '@asenajs/asena/auth';
import type { Context } from '@asenajs/hono-adapter';
import type { AppUser } from './AppAuth';

export interface CurrentUser {
  id: number;
  userName: string;
}

/**
 * The authenticated user of a @Protected route, with the numeric database id
 * the services work with. Throws a 401 HttpException when the request carries
 * no session — which a guarded route never reaches.
 */
export function currentUser(context: Context): CurrentUser {
  const { user } = requireAuthSession<AppUser>(context);

  return { id: Number(user.id), userName: user.userName };
}
