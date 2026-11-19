import { describe, expect, it } from '@jest/globals';
import { validateEnv } from './env.validation';

describe('Storefront shop configuration', () => {
  const shopUuid = 'be250838-85f9-41fa-b9f3-99aba3590640';
  const config = {
    PORT: '4030',
    ORIGINS: 'http://localhost:3010',
    AMQP_PORT: '5672',
    AMQP_HOSTNAME: 'localhost',
    AMQP_USERNAME: 'test',
    AMQP_PASSWORD: 'test',
    AMQP_CLIENT_GATEWAY_EVENT_QUEUE: 'test.events',
    AMQP_CLIENT_GATEWAY_EXCHANGE: 'test.exchange',
    AMQP_STORE_SRV_COMMAND_QUEUE: 'test.store',
    AMQP_PRODUCT_SRV_COMMAND_QUEUE: 'test.product',
    API_MEDIA_SRV: 'http://localhost:5050',
    AMQP_CART_SRV_COMMAND_QUEUE: 'cart.test',
    AMQP_IDENTITY_SRV_COMMAND_QUEUE: 'identity.test',
    AMQP_CLIENT_GATEWAY_CART_EVENT_QUEUE: 'cart.events.test',
    AMQP_EVENTS_EXCHANGE: 'event.test',
    AUTH_COOKIE: 'client.sid',
    AUTH_COOKIE_SECURE: 'false',
    SOCKET_TICKET_SECRET: 'a-secret-that-is-longer-than-32-characters',
    SOCKET_TICKET_AUDIENCE: 'realtime',
  };

  it('accepts and trims the configured shop UUID', () => {
    expect(validateEnv({ ...config, STOREFRONT_SHOP_UUID: ` ${shopUuid} ` }).STOREFRONT_SHOP_UUID).toBe(shopUuid);
  });

  it.each([undefined, '', 'not-a-uuid'])('rejects invalid shop configuration: %s', (value) => {
    expect(() => validateEnv({ ...config, STOREFRONT_SHOP_UUID: value })).toThrow('STOREFRONT_SHOP_UUID');
  });
});
