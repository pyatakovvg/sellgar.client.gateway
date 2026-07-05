import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/config/env.validation';
import { HealthModule } from '@/api/health/health.module';

@Module({
  imports: [
    HealthModule,

    HttpModule.register({
      global: true,
    }),
    ConfigModule.forRoot({
      envFilePath: ['gateways/client/.env', './.env'],
      validate: validateEnv,
      cache: true,
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
