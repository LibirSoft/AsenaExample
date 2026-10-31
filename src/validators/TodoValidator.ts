import { Middleware } from '@asenajs/asena/decorators';
import { Context, ValidationService } from '@asenajs/hono-adapter';
import { z } from 'zod';

const createTodoSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  isCompleted: z.boolean().default(false),
});

const updateTodoSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional(),
  isCompleted: z.boolean().optional(),
});

const todoIdSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateTodoDto = z.infer<typeof createTodoSchema>;
export type UpdateTodoDto = z.infer<typeof updateTodoSchema>;

/** Validates the JSON body of POST /todos. */
@Middleware({ validator: true })
export class CreateTodoValidator extends ValidationService {
  public json() {
    return createTodoSchema;
  }

  public response() {
    return {
      201: z.looseObject({ id: z.number(), title: z.string(), isCompleted: z.boolean() }),
      400: { schema: z.object({ message: z.string() }), description: 'Validation error' },
    };
  }
}

/**
 * Route context contracts (Context.define): the handler takes the class as its
 * first parameter and reads typed, validated values from context.input —
 * `context.input.params.id` is already a number. Used where no response()
 * schema is needed; routes documenting their responses keep a validator class.
 *
 * Controllers must import these as values (not `import type`), otherwise the
 * decorator metadata is erased and the route silently runs unvalidated.
 */

/** GET/DELETE /todos/:id */
export class TodoIdContext extends Context.define({ params: todoIdSchema }) {}

/** PUT /todos/:id — the :id parameter and the JSON body are validated together. */
export class UpdateTodoContext extends Context.define({ params: todoIdSchema, body: updateTodoSchema }) {}
