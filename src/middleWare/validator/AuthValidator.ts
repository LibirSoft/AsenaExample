import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';

@Middleware({ validator: true })
export class AuthValidator extends ValidationService {

  public json() {
    return z.object({
      email: z.string().email({ message: 'Valid email is required' }),
    });
  }

}
