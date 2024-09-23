import type { DefaultValidationService } from 'asena';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export interface CreteUserDto {
  userName: string;
  firstName: string;
  lastName: string;
  age: number;
  password: string;
  profileImage: string;
}

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export class CreateUserValidator implements DefaultValidationService {

  public form() {
    return zValidator(
      'form',
      z.object({
        file: z
          .any()
          .refine((file) => file?.size <= 5 * 1024 * 1024, `Max image size is 5MB.`)
          .refine(
            (file) => ACCEPTED_IMAGE_TYPES.includes(file?.type),
            'Only .jpg, .jpeg, .png and .webp formats are supported.',
          ),
        userName: z.string({ message: 'User name is required' }),
        firstName: z.string({ message: 'First name is required' }),
        lastName: z.string({ message: 'Last name is required' }),
        age: z.string({ message: 'Age is required' }),
        password: z.string({ message: 'Password is required' }),
      }),
    );
  }

}
