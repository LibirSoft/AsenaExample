import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ValidationService } from '@asenajs/asena';

export class CreateTodoValidator implements ValidationService {

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
