import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ClientPrincipal } from './session.types';

@Injectable()
export class CartTicketService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}
  async issue(principal: ClientPrincipal) {
    const ttl = Math.min(60, Math.floor((Date.parse(principal.expiresAt) - Date.now()) / 1000));
    if (ttl < 1) throw new UnauthorizedException();
    const ticket = await this.jwt.signAsync(
      {
        ...(principal.userUuid ? { sub: principal.userUuid } : {}),
        sid: principal.sessionUuid,
        oid: principal.ownerUuid,
        scope: 'carts',
      },
      {
        algorithm: 'HS256',
        audience: this.config.getOrThrow<string>('SOCKET_TICKET_AUDIENCE'),
        secret: this.config.getOrThrow<string>('SOCKET_TICKET_SECRET'),
        expiresIn: ttl,
      },
    );
    return { ticket, expiresAt: new Date(Date.now() + ttl * 1000).toISOString() };
  }
}
