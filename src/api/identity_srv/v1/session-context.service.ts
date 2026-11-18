import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { ClientSessionContext } from './session.types';

@Injectable()
export class SessionContextService {
  build(req: Request): ClientSessionContext {
    const agent = req.headers['user-agent'];
    const deviceId = req.headers['x-device-id'];
    if (typeof agent !== 'string' || !agent || typeof deviceId !== 'string' || !deviceId) {
      throw new BadRequestException('User-Agent and x-device-id are required');
    }
    return {
      device: agent.slice(0, 256),
      fingerprint: createHash('sha256')
        .update(agent + '\0' + deviceId)
        .digest('hex'),
      clientType: 'web',
      gateway: 'client_gw',
    };
  }
}
