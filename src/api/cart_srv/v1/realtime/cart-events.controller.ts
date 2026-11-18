import { BadGatewayException, Controller, Logger } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { ClassConstructor, Expose, instanceToPlain, plainToInstance } from 'class-transformer';
import { IsUUID, validateOrReject, ValidationError } from 'class-validator';
import { CartEntity } from '../cart/domain/cart.entity';
import { CartServiceClient } from '../shared/cart-service.client';
import { CartChangedPayloadDto, CartEventDto, CartProjectionPayloadDto, CartTargetDto } from './cart-event.dto';
import { CartRealtimePublisher } from './cart-realtime.publisher';
import { cartDeliveryId } from './cart-delivery-id';

class CartSnapshot extends CartEntity {
  @Expose()
  @IsUUID()
  ownerUuid: string;
}

class InvalidCartEvent extends Error {}

@Controller()
export class CartEventsController {
  private readonly logger = new Logger(CartEventsController.name);

  constructor(
    private readonly publisher: CartRealtimePublisher,
    private readonly carts: CartServiceClient,
  ) {}

  @EventPattern<unknown>(['cart.created', 'cart.updated', 'cart.closed', 'cart.projection.updated'])
  async handle(@Payload() input: unknown, @Ctx() context: RmqContext): Promise<void> {
    const channel = context.getChannelRef();
    const message = context.getMessage();
    try {
      const event = await this.checked(CartEventDto, input);
      if (event.eventType === 'cart.projection.updated') {
        const payload = await this.checked(CartProjectionPayloadDto, event.payload);
        if (
          event.aggregateType !== `cart_projection_${payload.source.aggregateType}` ||
          event.aggregateUuid !== payload.source.aggregateUuid ||
          event.aggregateVersion !== String(payload.source.version)
        )
          throw new InvalidCartEvent();
        for (const target of payload.targets) await this.publish(event, target);
      } else {
        const payload = await this.checked(CartChangedPayloadDto, event.payload);
        if (
          event.aggregateType !== 'cart' ||
          event.aggregateUuid !== payload.cartUuid ||
          event.aggregateVersion !== payload.version
        )
          throw new InvalidCartEvent();
        await this.publish(event, payload);
      }
      channel.ack(message);
    } catch (error) {
      const invalid =
        error instanceof InvalidCartEvent || (Array.isArray(error) && error.every((v) => v instanceof ValidationError));
      this.logger.error(invalid ? 'Rejected Cart notification' : 'Cart delivery publication will retry');
      channel.nack(message, false, !invalid);
    }
  }

  private async publish(event: CartEventDto, target: CartTargetDto): Promise<void> {
    const snapshot = await this.carts.request('cart.admin.getByUuid', { uuid: target.cartUuid }, CartSnapshot);
    if (
      snapshot.uuid !== target.cartUuid ||
      snapshot.ownerUuid !== target.ownerUuid ||
      snapshot.shop.uuid !== target.shopUuid
    )
      throw new BadGatewayException('Cart snapshot does not match event target');

    const cart = plainToInstance(CartEntity, instanceToPlain(snapshot), { excludeExtraneousValues: true });

    return this.publisher.publish({
      eventUuid:
        event.eventType === 'cart.projection.updated'
          ? cartDeliveryId(event.eventUuid, target.cartUuid)
          : event.eventUuid,
      eventType: event.eventType,
      schemaVersion: 2,
      occurredAt: event.occurredAt,
      channel: 'carts',
      ownerUuid: target.ownerUuid,
      payload: instanceToPlain(cart, { ignoreDecorators: true }),
    });
  }

  private async checked<T extends object>(Type: ClassConstructor<T>, input: unknown): Promise<T> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new InvalidCartEvent();
    const value = plainToInstance(Type, input);
    await validateOrReject(value, { whitelist: true, forbidNonWhitelisted: true });
    return value;
  }
}
