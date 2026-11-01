/**
 * Bootstraps an administrator: `bun run user:admin <userName>`.
 *
 * Roles change through PUT /admin/users/:id/role, which itself requires the
 * admin role — so the first admin is made here, out of band, and no HTTP
 * route can ever promote its own caller. Run it after the app has booted once
 * (migrations create the role column). Like MigrateService it uses its own
 * single connection, outside the IoC container.
 */
import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import { eq } from 'drizzle-orm';
import { users } from '../src/database/schemas/user.schema';
import { env } from '../src/env';

const userName = process.argv[2];

if (!userName) {
  console.error('Usage: bun run user:admin <userName>');
  process.exit(1);
}

const sql = new SQL({ ...env.database, max: 1 });

try {
  const [user] = await drizzle(sql)
    .update(users)
    .set({ role: 'admin' })
    .where(eq(users.userName, userName))
    .returning({ id: users.id });

  if (user) {
    // Sessions keep the roles they were created with — a promotion applies from the next login.
    console.log(`'${userName}' is now an admin. Log in again to get a session with the new role.`);
  } else {
    console.error(`No user named '${userName}'.`);
    process.exitCode = 1;
  }
} finally {
  await sql.end();
}
