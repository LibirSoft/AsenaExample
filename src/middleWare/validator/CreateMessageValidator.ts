import { ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';
import { Middleware } from '@asenajs/asena/server';

@Middleware({ validator: true })
export class CreateMessageValidator extends ValidationService {

  public json() {
    return z.object({
      content: z.string({ message: 'Message content is required' }).min(1, 'Message cannot be empty'),
      roomId: z.string({ message: 'Room ID is required' }).uuid('Room ID must be a valid UUID'),
    });
  }

}
