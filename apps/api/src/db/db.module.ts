import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_TOKEN, createDb } from './index';

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.getOrThrow<string>('DATABASE_URL');
        return createDb(url);
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DbModule {}
