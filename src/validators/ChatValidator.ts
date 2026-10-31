import { Middleware } from '@asenajs/asena/decorators';
import { Context, ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';

const createChatRoomSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().max(500).optional(),
});

const createMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

const roomIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const messageIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateChatRoomDto = z.infer<typeof createChatRoomSchema>;
export type CreateMessageDto = z.infer<typeof createMessageSchema>;

/** Validates the JSON body of POST /chat/rooms. */
@Middleware({ validator: true })
export class CreateChatRoomValidator extends ValidationService {
  public json() {
    return createChatRoomSchema;
  }

  public response() {
    return {
      201: z.looseObject({ id: z.number(), name: z.string(), createdBy: z.number() }),
      400: { schema: z.object({ message: z.string() }), description: 'Validation error' },
    };
  }
}

/**
 * A single validator can cover several request parts: the :id path parameter
 * and the JSON body of POST /chat/rooms/:id/messages are validated together.
 */
@Middleware({ validator: true })
export class SendMessageValidator extends ValidationService {
  public param() {
    return roomIdSchema;
  }

  public json() {
    return createMessageSchema;
  }

  public response() {
    return {
      201: z.looseObject({ id: z.number(), roomId: z.number(), senderId: z.number() }),
      400: { schema: z.object({ message: z.string() }), description: 'Validation error' },
    };
  }
}

/**
 * Route context contracts (Context.define) for routes that only need a typed
 * :id — handlers read `context.input.params.id` as a number. Import them as
 * values in the controller (never `import type`).
 */

/** The :id room parameter of the /chat/rooms/:id routes. */
export class RoomIdContext extends Context.define({ params: roomIdSchema }) {}

/** GET /chat/rooms/:id/messages — the room :id plus an optional ?limit. */
export class ListMessagesContext extends Context.define({
  params: roomIdSchema,
  query: z.object({ limit: z.coerce.number().int().positive().optional() }),
}) {}

/** The :id message parameter of the /chat/messages/:id routes. */
export class MessageIdContext extends Context.define({ params: messageIdSchema }) {}
