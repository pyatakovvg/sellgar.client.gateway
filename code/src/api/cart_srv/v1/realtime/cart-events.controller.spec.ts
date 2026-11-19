import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { RmqContext } from '@nestjs/microservices';
import { CartEventsController } from './cart-events.controller';
import { CartRealtimePublisher } from './cart-realtime.publisher';
import { CartServiceClient } from '../shared/cart-service.client';
import { cartDeliveryId } from './cart-delivery-id';

describe('Cart notification normalization', () => {
  const publish = jest.fn(),
    channel = { ack: jest.fn(), nack: jest.fn() };
  const request = jest.fn();
  const controller = new CartEventsController(
    { publish } as unknown as CartRealtimePublisher,
    { request } as unknown as CartServiceClient,
  );
  const context = new RmqContext([{}, channel, 'cart.projection.updated']);
  const source = {
    producer: 'product_srv_v2',
    aggregateType: 'product',
    aggregateUuid: randomUUID(),
    version: 2,
    eventUuid: randomUUID(),
  };
  const targets = [
    { cartUuid: randomUUID(), ownerUuid: randomUUID(), shopUuid: randomUUID() },
    { cartUuid: randomUUID(), ownerUuid: randomUUID(), shopUuid: randomUUID() },
  ];
  const event = {
    eventUuid: randomUUID(),
    eventType: 'cart.projection.updated',
    producer: 'cart_srv',
    schemaVersion: 1,
    aggregateType: 'cart_projection_product',
    aggregateUuid: source.aggregateUuid,
    aggregateVersion: '2',
    occurredAt: new Date().toISOString(),
    payload: { source, targets },
  };
  beforeEach(() => {
    jest.clearAllMocks();
    publish.mockReset().mockResolvedValue(undefined);
    request.mockReset().mockImplementation(async (_command, { uuid }) => {
      const target = targets.find((target) => target.cartUuid === uuid)!;
      return {
        uuid,
        ownerUuid: target.ownerUuid,
        version: '9007199254740993',
        shop: { uuid: target.shopUuid, name: 'Shop' },
        items: [],
        currencyCode: 'RUB',
        itemsTotal: '0.00',
      };
    });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it('splits targets privately and preserves distinct stable delivery IDs across retries', async () => {
    await controller.handle(event, context);
    const first = publish.mock.calls.map(([value]) => value);
    expect(first).toHaveLength(2);
    expect(first[0].eventUuid).not.toBe(first[1].eventUuid);
    expect(first[0]).toMatchObject({
      channel: 'carts',
      ownerUuid: targets[0].ownerUuid,
      payload: {
        uuid: targets[0].cartUuid,
        shop: { uuid: targets[0].shopUuid, name: 'Shop' },
        items: [],
        currencyCode: 'RUB',
        itemsTotal: '0.00',
      },
    });
    expect(first[0].payload.targets).toBeUndefined();
    expect(first[0].payload.ownerUuid).toBeUndefined();
    await controller.handle(event, context);
    expect(publish.mock.calls[2][0]).toEqual(first[0]);
    expect(channel.ack).toHaveBeenCalledTimes(2);
  });
  it('retries the complete fanout after a partial publication failure', async () => {
    publish.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('broker down'));
    await controller.handle(event, context);
    expect(channel.ack).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(context.getMessage(), false, true);
  });
  it.each([
    { producer: 'wrong' },
    { aggregateUuid: randomUUID() },
    { payload: { source, targets: [{ cartUuid: randomUUID() }] } },
  ])('rejects invalid source before publication %j', async (patch) => {
    await controller.handle({ ...event, ...patch }, context);
    expect(publish).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenCalledWith(context.getMessage(), false, false);
  });
  it('normalizes ordinary cart updates without changing the source event identity', async () => {
    const payload = { ...targets[0], version: '9007199254740993' };
    await controller.handle(
      {
        ...event,
        eventType: 'cart.updated',
        aggregateType: 'cart',
        aggregateUuid: payload.cartUuid,
        aggregateVersion: payload.version,
        payload,
      },
      context,
    );
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        eventUuid: event.eventUuid,
        ownerUuid: payload.ownerUuid,
        payload: expect.objectContaining({ version: payload.version }),
      }),
    );
    expect(channel.ack).toHaveBeenCalled();
  });
  it('retries when the authoritative snapshot is unavailable or belongs to a different owner', async () => {
    request.mockRejectedValueOnce(new Error('Cart unavailable'));
    await controller.handle(event, context);
    expect(publish).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenLastCalledWith(context.getMessage(), false, true);
    request.mockResolvedValueOnce({
      uuid: targets[0].cartUuid,
      ownerUuid: targets[1].ownerUuid,
      shop: { uuid: targets[0].shopUuid },
    });
    await controller.handle(event, context);
    expect(publish).not.toHaveBeenCalled();
    expect(channel.nack).toHaveBeenLastCalledWith(context.getMessage(), false, true);
  });

  it('uses the standard UUID v5 algorithm for target delivery identities', () => {
    expect(cartDeliveryId('6ba7b810-9dad-11d1-80b4-00c04fd430c8', 'www.widgets.com')).toBe(
      '21f7f8de-8051-5b89-8680-0195ef798b6a',
    );
  });
});
