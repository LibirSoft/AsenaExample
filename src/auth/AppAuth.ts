import type { AuthUser } from '@asenajs/asena/auth';
import { Inject } from '@asenajs/asena/decorators/ioc';
import { AsenaAuthService, Auth } from '@asenajs/asena-auth';
import { env } from '../env';
import type { SessionRepository } from '../repositories/SessionRepository';
import { DrizzleSessionStore } from './DrizzleSessionStore';

/**
 * The user snapshot stored in a session. asena-auth ids are strings; handlers
 * read the numeric database id through currentUser().
 */
export interface AppUser extends AuthUser {
  id: string;
  userName: string;
}

/**
 * The application's auth provider (@asenajs/asena-auth): opaque session
 * tokens accepted as `Authorization: Bearer <token>` or the HttpOnly
 * `asena_session` cookie. Only their SHA-256 is stored, so a session can be
 * revoked server-side at any time — something a stateless JWT cannot do.
 *
 * Its marks (@Protected) are enforced by the AuthGuard that src/index.ts
 * registers through `imports: [...authComponents]`.
 */
@Auth({
  sessionTtl: env.sessionTtl,
  // Same algorithm the existing password hashes use; verification reads the
  // algorithm from the hash, so older bcrypt/argon2 rows keep verifying too.
  hashing: { algorithm: 'argon2id' },
  // A cookie session sent cross-site on a state-changing request counts as no
  // session. The SPA origins the CORS policy allows are trusted explicitly.
  csrf: { trustedOrigins: [...env.allowedOrigins] },
})
export class AppAuth extends AsenaAuthService<AppUser> {
  @Inject('SessionRepository')
  private sessionRepository!: SessionRepository;

  /**
   * A store that needs injected collaborators is set here — injection is done
   * by now — and BEFORE super.onStart(), which validates the options and
   * starts the store.
   */
  public override async onStart(): Promise<void> {
    this.setStore(new DrizzleSessionStore(this.sessionRepository));
    await super.onStart();
  }
}
