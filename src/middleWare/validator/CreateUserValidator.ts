import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';
import { ValidationService } from '@asenajs/hono-adapter';

export interface CreteUserDto {
  userName: string;
  firstName: string;
  lastName: string;
  age: number;
  password: string;
  profileImage: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Middleware({ validator: true })
export class CreateUserValidator extends ValidationService {

  public form() {
    return z.object({
      file: z
        .any()
        .refine((file) => file?.size <= 5 * 1024 * 1024, `Max image size is 5MB.`)
        .refine(
          (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
          'Only .jpg, .jpeg, .png and .webp formats are supported.',
        )
        .optional(),
      userName: z.string({ message: 'User name is required' }),
      firstName: z.string({ message: 'First name is required' }),
      lastName: z.string({ message: 'Last name is required' }),
      age: z.string({ message: 'Age is required' }),
      password: z.string({ message: 'Password is required' }),
    });
  }

}
