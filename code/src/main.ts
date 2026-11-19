import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { connect } from 'amqplib';

import { AllExceptionsFilter } from './common/exceptions/all-exception.filter';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger();

  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    credentials: true,
    origin: config
      .getOrThrow<string>('ORIGINS')
      .split(';')
      .map((origin) => origin.trim())
      .filter(Boolean),
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  app.connectMicroservice<MicroserviceOptions>({
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
      wildcards: true,
      persistent: true,
      prefetchCount: 1,
      queue: config.getOrThrow<string>('AMQP_CLIENT_GATEWAY_EVENT_QUEUE'),
      queueOptions: {
        durable: true,
      },
      exchange: config.getOrThrow<string>('AMQP_CLIENT_GATEWAY_EXCHANGE'),
      exchangeType: 'topic',
    },
  });

  const port = config.getOrThrow<number>('PORT');

  const cartQueue = config.getOrThrow<string>('AMQP_CLIENT_GATEWAY_CART_EVENT_QUEUE');
  const deadExchange = `${cartQueue}.dead.exchange`;
  const broker = await connect({
    hostname: config.getOrThrow<string>('AMQP_HOSTNAME'),
    port: config.getOrThrow<number>('AMQP_PORT'),
    username: config.getOrThrow<string>('AMQP_USERNAME'),
    password: config.getOrThrow<string>('AMQP_PASSWORD'),
  });
  try {
    const channel = await broker.createChannel();
    await channel.assertExchange(deadExchange, 'topic', { durable: true });
    await channel.assertQueue(`${cartQueue}.dead`, { durable: true });
    await channel.bindQueue(`${cartQueue}.dead`, deadExchange, '#');
    await channel.close();
  } finally {
    await broker.close();
  }
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        {
          hostname: config.getOrThrow<string>('AMQP_HOSTNAME'),
          port: config.getOrThrow<number>('AMQP_PORT'),
          username: config.getOrThrow<string>('AMQP_USERNAME'),
          password: config.getOrThrow<string>('AMQP_PASSWORD'),
        },
      ],
      queue: cartQueue,
      queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': deadExchange } },
      exchange: config.getOrThrow<string>('AMQP_EVENTS_EXCHANGE'),
      exchangeType: 'topic',
      wildcards: true,
      noAck: false,
      persistent: true,
      prefetchCount: 1,
    },
  });

  app.enableShutdownHooks();

  await app.startAllMicroservices();
  await app.listen(port, () => {
    logger.log('Client gateway has been started on port ' + port);
  });
}

(async () => {
  await bootstrap();
})();
