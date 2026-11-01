import { Context } from '@asenajs/hono-adapter';
import { z } from 'zod';

/**
 * DELETE /auth/sessions/:id — a session id is the hex SHA-256 of its token.
 * Malformed ids are a 400 before the service runs; well-formed ids of other
 * users' sessions are the service's business (404).
 */
export class SessionIdContext extends Context.define({
  params: z.object({
    id: z.string().regex(/^[0-9a-f]{64}$/, { message: 'Invalid session id' }),
  }),
}) {}
