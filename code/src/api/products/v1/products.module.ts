import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { ProductGateway } from './gateway/product.gateway';
import { StoreProductGateway } from './gateway/store-product.gateway';
import { OffersController } from './offers.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    ClientsModule.registerAsync({
      clients: [
        {
          name: 'STORE_COMMAND_SERVICE',
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            transport: Transport.RMQ,
            options: {
              urls: [
                {
                  port: config.getOrThrow<number>('AMQP_PORT'),
                  hostname: config.getOrThrow<string>('AMQP_HOSTNAME'),
                  username: config.getOrThrow<string>('AMQP_USERNAME'),
                  password: config.getOrThrow<string>('AMQP_PASSWORD'),
                },
              ],
              persistent: true,
              prefetchCount: 1,
              queue: config.getOrThrow<string>('AMQP_STORE_SRV_COMMAND_QUEUE'),
              queueOptions: {
                durable: true,
              },
            },
          }),
        },
        {
          name: 'PRODUCT_COMMAND_SERVICE',
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            transport: Transport.RMQ,
            options: {
              urls: [
                {
                  port: config.getOrThrow<number>('AMQP_PORT'),
                  hostname: config.getOrThrow<string>('AMQP_HOSTNAME'),
                  username: config.getOrThrow<string>('AMQP_USERNAME'),
                  password: config.getOrThrow<string>('AMQP_PASSWORD'),
                },
              ],
              persistent: true,
              prefetchCount: 1,
              queue: config.getOrThrow<string>('AMQP_PRODUCT_SRV_COMMAND_QUEUE'),
              queueOptions: {
                durable: true,
              },
            },
          }),
        },
      ],
    }),
  ],
  controllers: [OffersController, ProductsController],
  providers: [ProductGateway, StoreProductGateway, ProductsService],
})
export class ProductsModule {}
