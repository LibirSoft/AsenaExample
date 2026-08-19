import { Middleware } from '@asenajs/asena/decorators';
import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const signupSchema = z.object({
  userName: z.string().min(3).max(50),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  age: z.coerce.number().int().min(13).max(120),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  // z.file() maps to a binary (multipart) field in the generated OpenAPI spec.
  file: z
    .file()
    .refine((file) => file.size <= MAX_IMAGE_SIZE, { message: 'Max image size is 5MB' })
    .refine((file) => ACCEPTED_IMAGE_TYPES.includes(file.type), {
      message: 'Only .jpg, .png and .webp formats are supported',
    }),
});

export type SignupDto = z.infer<typeof signupSchema>;

@Middleware({ validator: true })
export class SignupValidator extends ValidationService {
  public form() {
    return signupSchema;
  }

  public response() {
    return {
      201: z.object({
        success: z.boolean(),
        user: z.looseObject({ id: z.number(), userName: z.string(), profileImage: z.string().nullable() }),
      }),
      400: { schema: z.object({ message: z.string() }), description: 'Validation error' },
      409: { schema: z.object({ message: z.string() }), description: 'User name already taken' },
    };
  }
}
