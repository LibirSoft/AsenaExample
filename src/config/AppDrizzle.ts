import { Drizzle, TransactionPostProcessor } from '@asenajs/asena-drizzle';

/**
 * Enables @Transaction methods by registering the Drizzle post-processor.
 * Without this class in the source folder, @Transaction is silently inert.
 */
@Drizzle({ defaultDb: 'MainDatabase' })
export class AppDrizzle extends TransactionPostProcessor {}
