import type { DefaultValidationService } from 'asena';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export class AuthValidator implements DefaultValidationService {

  public json() {
    return zValidator(
      'json',
      z.object({
        firstname: z.string({ message: 'Username is required' }),
        password: z.string({ message: 'Password is required' }),
      }),
    );
  }

}
