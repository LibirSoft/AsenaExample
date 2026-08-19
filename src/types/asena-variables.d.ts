import type { PublicUser } from '../services/UserService';

/**
 * Types context.getValue('user') across the app — set by AuthMiddleware,
 * read by every protected handler.
 */
declare module '@asenajs/asena/adapter' {
  interface AsenaVariables {
    user: PublicUser;
  }
}
