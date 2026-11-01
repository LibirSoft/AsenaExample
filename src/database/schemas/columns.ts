import { customType } from 'drizzle-orm/pg-core';

/**
 * A jsonb column for the bun-sql driver. Drizzle's built-in jsonb()
 * JSON.stringify()s the value and Bun SQL then sends that string as a JSON
 * *string* scalar — the column ends up holding "{\"id\":\"1\"}" instead of an
 * object, which breaks `user->>'userName'` style queries. Bun SQL serializes
 * objects for jsonb parameters itself, so this type passes values through.
 */
export const jsonb = <TData>(name: string) =>
  customType<{ data: TData; driverData: TData }>({ dataType: () => 'jsonb' })(name);
