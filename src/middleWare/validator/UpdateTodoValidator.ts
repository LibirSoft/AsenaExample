import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';

@Middleware({ validator: true })
export class UpdateTodoValidator extends ValidationService {

  public json() {
    return z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      isCompleted: z.boolean().optional(),
    });
  }

}

