import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { DATABASE_POOL } from './database/database.constants';

describe('AppModule', () => {
  it('compiles', async () => {
    // A stand-in pool: compiling the module must not need a database.
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_POOL)
      .useValue({ end: jest.fn() })
      .compile();

    expect(moduleRef).toBeDefined();
  });
});
