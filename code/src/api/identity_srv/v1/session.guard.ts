import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { SessionService } from './session.service';
import { SessionRequest } from './session.types';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly sessions: SessionService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<SessionRequest>();
    req.principal = await this.sessions.resolve(req, context.switchToHttp().getResponse());
    return true;
  }
}
