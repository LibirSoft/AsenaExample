import { Middleware } from '@asenajs/asena/decorators';
import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';

const loginSchema = z.object({
  userName: z.string().min(1, { message: 'User name is required' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export type LoginDto = z.infer<typeof loginSchema>;

@Middleware({ validator: true })
export class LoginValidator extends ValidationService {
  public json() {
    return loginSchema;
  }

  public response() {
    return {
      200: z.object({
        success: z.boolean(),
        token: z.string(),
        user: z.looseObject({ id: z.number(), userName: z.string() }),
      }),
      400: { schema: z.object({ message: z.string() }), description: 'Validation error' },
      401: { schema: z.object({ message: z.string() }), description: 'Invalid credentials' },
    };
  }
}
