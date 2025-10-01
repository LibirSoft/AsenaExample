import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';

@Middleware({ validator: true })
export class CreateChatRoomValidator extends ValidationService {

  public json() {
    return z.object({
      name: z.string({ message: 'Room name is required' }).min(3, 'Room name must be at least 3 characters'),
      description: z.string().optional(),
    });
  }

}
