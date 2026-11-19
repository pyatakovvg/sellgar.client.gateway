import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { CartServiceClient } from './shared/cart-service.client';
import { CartModule } from './cart/cart.module';
import { CART_COMMAND_SERVICE, CART_REALTIME_SERVICE } from './shared/cart-service.constants';
import { CartEventsController } from './realtime/cart-events.controller';
import { CartRealtimePublisher } from './realtime/cart-realtime.publisher';
@Module({
  imports: [
    ClientsModule.registerAsync({
      isGlobal: true,
      clients: [
        {
          name: CART_COMMAND_SERVICE,
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            transport: Transport.RMQ,
            options: {
              urls: [
                {
                  hostname: config.getOrThrow('AMQP_HOSTNAME'),
                  port: config.getOrThrow('AMQP_PORT'),
                  username: config.getOrThrow('AMQP_USERNAME'),
                  password: config.getOrThrow('AMQP_PASSWORD'),
                },
              ],
              queue: config.getOrThrow<string>('AMQP_CART_SRV_COMMAND_QUEUE'),
              queueOptions: { durable: true },
            },
          }),
        },
        {
          name: CART_REALTIME_SERVICE,
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            transport: Transport.RMQ,
            options: {
              urls: [
                {
                  hostname: config.getOrThrow('AMQP_HOSTNAME'),
                  port: config.getOrThrow('AMQP_PORT'),
                  username: config.getOrThrow('AMQP_USERNAME'),
                  password: config.getOrThrow('AMQP_PASSWORD'),
                },
              ],
              queue: '',
              queueOptions: { durable: false, autoDelete: true },
              persistent: true,
              wildcards: true,
              exchange: config.getOrThrow<string>('AMQP_EVENTS_EXCHANGE'),
              exchangeType: 'topic',
            },
          }),
        },
      ],
    }),
    CartModule,
  ],
  controllers: [CartEventsController],
  providers: [CartRealtimePublisher, CartServiceClient],
})
export class ApiCartV1Module {}
