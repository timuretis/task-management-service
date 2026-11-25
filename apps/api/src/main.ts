import { ConsoleLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap(): Promise<void> {
  // Read config first so a bad value stops the process before the server starts.
  const config = loadConfig();
  // JSON lines in production so CloudWatch can filter by field; readable text elsewhere.
  const logger = new ConsoleLogger({ json: config.nodeEnv === 'production' });
  const app = await NestFactory.create(AppModule, { logger });
  await app.listen(config.port);
}

void bootstrap();
