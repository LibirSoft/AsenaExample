import type { ValidationService } from '@asenajs/asena';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export class AuthValidator implements ValidationService {

  public json() {
    return zValidator(
      'json',
      z.object({
        userName: z.string({ message: 'Username is required' }),
        password: z.string({ message: 'Password is required' }),
      }),
    );
  }

}
