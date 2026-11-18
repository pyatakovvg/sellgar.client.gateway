import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { Response } from 'express';
import { CartTicketService } from './cart-ticket.service';
import { SessionService } from './session.service';
import { ClientPrincipal, SessionRequest } from './session.types';

export class LoginDto {
  @IsString() @MinLength(1) @MaxLength(256) login: string;
  @IsString() @MinLength(1) @MaxLength(4096) password: string;
}

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly sessions: SessionService,
    private readonly tickets: CartTicketService,
  ) {}
  @Post('login')
  async login(@Req() req: SessionRequest, @Res({ passthrough: true }) res: Response, @Body() input: LoginDto) {
    return this.publicPrincipal(await this.sessions.login(req, res, input));
  }
  @Post('session')
  async initialize(@Req() req: SessionRequest, @Res({ passthrough: true }) res: Response) {
    return this.publicPrincipal(await this.sessions.initialize(req, res));
  }

  @Get('session')
  async current(@Req() req: SessionRequest, @Res({ passthrough: true }) res: Response) {
    return this.publicPrincipal(await this.sessions.resolve(req, res, { renew: false }));
  }
  @Post('logout')
  async logout(@Req() req: SessionRequest, @Res({ passthrough: true }) res: Response) {
    await this.sessions.logout(req, res);
    return { loggedOut: true };
  }
  @Post('socket-ticket')
  async ticket(@Req() req: SessionRequest, @Res({ passthrough: true }) res: Response) {
    return this.tickets.issue(await this.sessions.resolve(req, res, { renew: false }));
  }
  private publicPrincipal(principal: ClientPrincipal) {
    return { userUuid: principal.userUuid, sessionUuid: principal.sessionUuid, expiresAt: principal.expiresAt };
  }
}
