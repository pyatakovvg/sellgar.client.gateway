import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { CartTicketService } from './cart-ticket.service';
import { IDENTITY_COMMAND_SERVICE, IdentityGateway } from './identity.gateway';
import { SessionContextService } from './session-context.service';
import { SessionCookieService } from './session-cookie.service';
import { SessionGuard } from './session.guard';
import { SessionService } from './session.service';

@Module({
  imports: [
    JwtModule.register({}),
    ClientsModule.registerAsync({
      clients: [
        {
          name: IDENTITY_COMMAND_SERVICE,
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
              queue: config.getOrThrow<string>('AMQP_IDENTITY_SRV_COMMAND_QUEUE'),
              queueOptions: { durable: true },
            },
          }),
        },
      ],
    }),
  ],
  controllers: [AuthController],
  providers: [
    IdentityGateway,
    SessionContextService,
    SessionCookieService,
    SessionGuard,
    SessionService,
    CartTicketService,
  ],
  exports: [SessionGuard, SessionService],
})
export class ApiIdentityV1Module {}
