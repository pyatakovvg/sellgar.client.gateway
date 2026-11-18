import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { CART_REALTIME_SERVICE } from '../shared/cart-service.constants';

@Injectable()
export class CartRealtimePublisher {
  constructor(@Inject(CART_REALTIME_SERVICE) private readonly client: ClientProxy) {}
  async publish(delivery: {
    eventUuid: string;
    eventType: string;
    schemaVersion: number;
    occurredAt: string;
    channel: 'carts';
    ownerUuid: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await firstValueFrom(this.client.emit('realtime.delivery.requested.v1', delivery).pipe(timeout(5000)));
  }
}
