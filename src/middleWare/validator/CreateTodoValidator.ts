import type { DefaultValidationService } from 'asena';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export class CreateTodoValidator implements DefaultValidationService {

  public json() {
    return zValidator(
      'json',
      z.object({
        title: z.string({ message: 'Title is required' }),
        description: z.string({ message: 'Description is required' }),
        isCompleted: z.boolean({ message: 'isCompleted is required' }),
      }),
    );
  }

}
