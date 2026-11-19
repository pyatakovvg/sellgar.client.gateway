import { BadGatewayException, Injectable, UnauthorizedException } from '@nestjs/common';
import { isISO8601, isUUID } from 'class-validator';
import { Request, Response } from 'express';

import { IdentityGateway } from './identity.gateway';
import { SessionContextService } from './session-context.service';
import { SessionCookieService } from './session-cookie.service';
import { ClientPrincipal } from './session.types';

@Injectable()
export class SessionService {
  constructor(
    private readonly identity: IdentityGateway,
    private readonly context: SessionContextService,
    private readonly cookies: SessionCookieService,
  ) {}

  async login(req: Request, res: Response, input: { login: string; password: string }): Promise<ClientPrincipal> {
    const result = await this.identity.request('identity.auth.signIn', {
      ...input,
      ...this.context.build(req),
      sessionSecret: this.cookies.read(req) ?? undefined,
    });
    const { principal, secret } = this.issued(result);
    this.cookies.set(res, secret, principal.expiresAt);
    return principal;
  }

  async initialize(req: Request, res: Response): Promise<ClientPrincipal> {
    if (this.cookies.read(req)) {
      try {
        const principal = await this.resolve(req, res, { renew: false });
        if (principal.userUuid !== null) return await this.resolve(req, res);
        const input = { sessionSecret: this.cookies.read(req), ...this.context.build(req) };
        const renewed = await this.identity.request('identity.session.renew', input);
        if (renewed !== null) {
          const issued = this.issued(renewed);
          this.cookies.set(res, issued.secret, issued.principal.expiresAt);
          return issued.principal;
        }
        return await this.resolve(req, res, { renew: false });
      } catch (error) {
        if (!(error instanceof UnauthorizedException)) throw error;
      }
    }
    return this.issueGuest(req, res);
  }

  async resolve(req: Request, res: Response, options: { renew?: boolean } = {}): Promise<ClientPrincipal> {
    const renew = options.renew ?? true;
    const secret = this.cookies.read(req);
    if (!secret) throw new UnauthorizedException();
    const input = { sessionSecret: secret, ...this.context.build(req) };
    let data = this.verification(await this.identity.request('identity.session.verify', input));
    if (data.status === 'renew_required' && data.userId === null) {
      return this.principal(data.sessionId, data.userId, data.ownerUuid, data.expiresAt);
    }
    if (data.status === 'renew_required' && renew) {
      const renewed = await this.identity.request('identity.session.renew', input);
      if (renewed !== null) {
        const { principal, secret } = this.issued(renewed);
        this.cookies.set(res, secret, principal.expiresAt);
        return principal;
      }
      data = this.verification(await this.identity.request('identity.session.verify', input));
    }
    if (data.status === 'renew_required' && !renew) {
      return this.principal(data.sessionId, data.userId, data.ownerUuid, data.expiresAt);
    }
    if (data.status === 'renew_required') throw new BadGatewayException('Identity did not confirm session renewal');
    if (data.status !== 'active') {
      this.cookies.clear(res);
      throw new UnauthorizedException();
    }
    return this.principal(data.sessionId, data.userId, data.ownerUuid, data.expiresAt);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const context = this.context.build(req);
    const secret = this.cookies.read(req);
    if (secret) await this.identity.request('identity.session.revoke', { sessionSecret: secret, ...context });
    this.cookies.clear(res);
  }

  private async issueGuest(req: Request, res: Response): Promise<ClientPrincipal> {
    const result = this.issued(await this.identity.request('identity.session.issueGuest', this.context.build(req)));
    if (result.principal.userUuid !== null) throw new BadGatewayException('Identity did not issue a guest session');
    this.cookies.set(res, result.secret, result.principal.expiresAt);
    return result.principal;
  }

  private issued(input: unknown): { principal: ClientPrincipal; secret: string } {
    const result = this.object(input);
    if (typeof result.sessionSecret !== 'string' || !result.sessionSecret)
      throw new BadGatewayException('Invalid Identity session response');
    return {
      principal: this.principal(result.uuid, result.userId, result.ownerUuid, result.expiresAt),
      secret: result.sessionSecret,
    };
  }

  private verification(input: unknown): Record<string, unknown> {
    const data = this.object(this.object(input).data);
    if (
      typeof data.status !== 'string' ||
      !['active', 'renew_required', 'invalid', 'revoked', 'expired'].includes(data.status)
    )
      throw new BadGatewayException('Invalid Identity verification response');
    return data;
  }

  private object(input: unknown): Record<string, unknown> {
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new BadGatewayException('Invalid Identity response');
    return input as Record<string, unknown>;
  }

  private principal(sessionUuid: unknown, userUuid: unknown, ownerUuid: unknown, expiresAt: unknown): ClientPrincipal {
    if (
      !isUUID(sessionUuid) ||
      (userUuid !== null && !isUUID(userUuid)) ||
      !isUUID(ownerUuid) ||
      typeof expiresAt !== 'string' ||
      !isISO8601(expiresAt) ||
      Date.parse(expiresAt) <= Date.now()
    ) {
      throw new BadGatewayException('Invalid Identity principal');
    }
    return {
      sessionUuid: sessionUuid as string,
      userUuid: userUuid as string | null,
      ownerUuid: ownerUuid as string,
      expiresAt,
    };
  }
}
