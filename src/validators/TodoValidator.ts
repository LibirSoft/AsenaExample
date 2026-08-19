import { Middleware } from '@asenajs/asena/decorators';
import { ValidationService } from '@asenajs/hono-adapter';
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
 * A single validator can cover several request parts: the :id path parameter
 * and the JSON body of PUT /todos/:id are validated together.
 */
@Middleware({ validator: true })
export class UpdateTodoValidator extends ValidationService {
  public param() {
    return todoIdSchema;
  }

  public json() {
    return updateTodoSchema;
  }
}

/** Validates the :id path parameter of GET/DELETE /todos/:id. */
@Middleware({ validator: true })
export class TodoIdValidator extends ValidationService {
  public param() {
    return todoIdSchema;
  }
}
