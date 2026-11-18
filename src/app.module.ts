import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnv } from '@/config/env.validation';
import { FilesModule } from '@/api/files/v1/files.module';
import { HealthModule } from '@/api/health/health.module';
import { ApiIdentityV1Module } from './api/identity_srv/v1/api.module';
import { ApiCartV1Module } from './api/cart_srv/v1/api.module';

import { ProductsModule } from '@/api/products/v1/products.module';

@Module({
  imports: [
    HealthModule,
    FilesModule,
    ProductsModule,
    ApiIdentityV1Module,
    ApiCartV1Module,

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
