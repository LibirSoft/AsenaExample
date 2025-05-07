import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';

@Middleware({ validator: true })
export class AuthValidator extends ValidationService {

  public json() {
    return z.object({
      userName: z.string({ message: 'Username is required' }),
      password: z.string({ message: 'Password is required' }),
    });
  }

}
