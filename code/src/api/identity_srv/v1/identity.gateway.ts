import { GatewayTimeoutException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

export const IDENTITY_COMMAND_SERVICE = 'IDENTITY_COMMAND_SERVICE';
@Injectable()
export class IdentityGateway {
  constructor(@Inject(IDENTITY_COMMAND_SERVICE) private readonly client: ClientProxy) {}
  async request(command: string, payload: object): Promise<unknown> {
    try {
      return await firstValueFrom(this.client.send({ cmd: command }, payload).pipe(timeout(5000)));
    } catch (error) {
      if (error instanceof TimeoutError) throw new GatewayTimeoutException('Identity service did not respond');
      throw error;
    }
  }
}
