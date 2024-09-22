import type { DefaultValidationService } from 'asena';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ClientErrorStatusCode } from 'asena/src/server/web/http';

export class CreateUserValidator implements DefaultValidationService {

  public json() {
    return zValidator(
      'json',
      z.object({
        firstName: z.string({ message: 'First name is required' }),
        lastName: z.string({ message: 'Last name is required' }),
        age: z.number({ message: 'Age is required' }),
      }),
      (result, ctx) => {

        return ctx.json(result, ClientErrorStatusCode.BAD_REQUEST);
      },
    );
  }

}
