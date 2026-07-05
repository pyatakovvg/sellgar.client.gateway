import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/config/env.validation';
import { FilesModule } from '@/api/files/v1/files.module';
import { HealthModule } from '@/api/health/health.module';
import { ProductsModule } from '@/api/products/v1/products.module';

@Module({
  imports: [
    HealthModule,
    FilesModule,
    ProductsModule,

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
