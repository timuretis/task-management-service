import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { loadConfig } from './config';

async function bootstrap(): Promise<void> {
  // Read config first so a bad value stops the process before the server starts.
  const config = loadConfig();
  const app = await NestFactory.create(AppModule);
  await app.listen(config.port);
}

void bootstrap();
