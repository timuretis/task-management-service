import { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { AppConfig } from './config';

/**
 * Hardening shared by main.ts and the e2e tests, so tests exercise the real setup.
 * The JSON body limit is Express's default of 100 KB, which is what we want (see D8).
 */
export function configureApp(app: INestApplication, config: AppConfig): void {
  app.use(helmet());
  // Only the web app's origin(s) may call the API from a browser; there is no wildcard.
  app.enableCors({ origin: config.corsOrigins });
  // Lets Docker's SIGTERM finish in-flight requests before the process exits.
  app.enableShutdownHooks();
}
