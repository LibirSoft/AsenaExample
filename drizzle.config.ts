import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  out: './src/db/drizzle',
  schema: './src/core/schemas/*.ts',
  dbCredentials: {
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'asenatest',
    ssl: false,
  },
  // Print all statements
  verbose: true,
  // Always ask for confirmation
  strict: true,
});
