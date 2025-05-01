import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';

@Middleware({ validator: true })
export class CreateTodoValidator extends ValidationService {

  public json() {
    return z.object({
      title: z.string({ message: 'Title is required' }),
      description: z.string({ message: 'Description is required' }),
      isCompleted: z.boolean({ message: 'isCompleted is required' }),
    });
  }

}
