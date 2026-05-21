import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsModule } from './events/events.module';
import { EventEntity } from './events/event.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) {
          throw new Error('DATABASE_URL is required. Copy .env.example to .env and set it.');
        }
        return {
          type: 'postgres',
          url,
          entities: [EventEntity],
          synchronize: false,
          migrations: ['dist/migrations/*.js'],
          migrationsRun: true,
          logging: ['error', 'warn'],
        };
      },
    }),
    EventsModule,
  ],
})
export class AppModule {}
