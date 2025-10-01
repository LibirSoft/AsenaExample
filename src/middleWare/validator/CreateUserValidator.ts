import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';
import { ValidationService } from '@asenajs/hono-adapter';

export interface CreateUserDto {
  name: string;
  email: string;
}

@Middleware({ validator: true })
export class CreateUserValidator extends ValidationService {

  public json() {
    return z.object({
      name: z.string().min(1, { message: 'Name is required' }),
      email: z.string().email({ message: 'Valid email is required' }),
    });
  }

}
