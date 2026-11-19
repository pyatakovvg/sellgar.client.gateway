import { randomUUID } from 'node:crypto';
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import request from 'supertest';
import { AllExceptionsFilter } from '@/common/exceptions/all-exception.filter';
import { IDENTITY_COMMAND_SERVICE } from '../../../../identity_srv/v1/identity.gateway';
import { ApiCartV1Module } from '../../api.module';
import { CART_COMMAND_SERVICE, CART_REALTIME_SERVICE } from '../../shared/cart-service.constants';

describe('Customer Cart and session HTTP', () => {
  let app: INestApplication;
  const identity = jest.fn(),
    cartSend = jest.fn();
  const userUuid = randomUUID(),
    ownerUuid = randomUUID(),
    sessionUuid = randomUUID(),
    shopUuid = randomUUID(),
    cartUuid = randomUUID(),
    recordUuid = randomUUID(),
    idempotencyKey = randomUUID();
  const secret = 'test-secret',
    signingSecret = 'a-secret-that-is-longer-than-32-characters';
  const expiresAt = () => new Date(Date.now() + 3600000).toISOString();
  const active = () => ({
    data: { status: 'active', sessionId: sessionUuid, userId: userUuid, ownerUuid, expiresAt: expiresAt() },
    meta: {},
  });
  const cart = {
    uuid: cartUuid,
    ownerUuid,
    version: '1',
    shop: { uuid: shopUuid, name: 'Центр', sourceVersion: 1 },
    items: [],
    currencyCode: 'RUB',
    itemsTotal: '0.00',
  };
  const auth = (r: request.Test) =>
    r.set('Cookie', `client.sid=${secret}`).set('x-device-id', 'browser-1').set('User-Agent', 'Cart test browser');
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              STOREFRONT_SHOP_UUID: shopUuid,
              AUTH_COOKIE: 'client.sid',
              AUTH_COOKIE_SECURE: false,
              SOCKET_TICKET_SECRET: signingSecret,
              SOCKET_TICKET_AUDIENCE: 'realtime',
            }),
          ],
        }),
        ApiCartV1Module,
      ],
    })
      .overrideProvider(IDENTITY_COMMAND_SERVICE)
      .useValue({ send: identity })
      .overrideProvider(CART_COMMAND_SERVICE)
      .useValue({ send: cartSend })
      .overrideProvider(CART_REALTIME_SERVICE)
      .useValue({ emit: jest.fn() })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    identity
      .mockReset()
      .mockImplementation(({ cmd }) =>
        of(
          cmd === 'identity.auth.signIn'
            ? { uuid: sessionUuid, userId: userUuid, ownerUuid, expiresAt: expiresAt(), sessionSecret: secret }
            : active(),
        ),
      );
    cartSend
      .mockReset()
      .mockImplementation(({ cmd }) =>
        of(cmd === 'cart.get' ? cart : { cartUuid, recordUuid, version: '2', quantity: 2 }),
      );
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(async () => app.close());
  it('requires an initialized session and never creates guests implicitly from Cart reads', async () => {
    await request(app.getHttpServer()).get('/v1/cart').expect(401);
    expect(identity).not.toHaveBeenCalled();
    expect(cartSend).not.toHaveBeenCalled();
  });
  it('logs in through Identity and sets HttpOnly cookie without exposing credentials', async () => {
    const result = await request(app.getHttpServer())
      .post('/v1/auth/login')
      .set('x-device-id', 'browser-1')
      .set('User-Agent', 'Cart test browser')
      .send({ login: 'test', password: 'password', ownerUuid: randomUUID() })
      .expect(201);
    expect(identity).toHaveBeenCalledWith(
      { cmd: 'identity.auth.signIn' },
      expect.objectContaining({
        login: 'test',
        gateway: 'client_gw',
        clientType: 'web',
        fingerprint: expect.any(String),
      }),
    );
    expect(identity.mock.calls[0][1].ownerUuid).toBeUndefined();
    expect(result.body.sessionSecret).toBeUndefined();
    expect(result.body.ownerUuid).toBeUndefined();
    expect(result.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    expect(result.headers['set-cookie'][0]).toMatch(/SameSite=Lax/);
  });
  it('initializes a guest only through the session endpoint, without creating a cart or exposing owner', async () => {
    identity.mockReturnValue(
      of({ uuid: sessionUuid, userId: null, ownerUuid, expiresAt: expiresAt(), sessionSecret: secret }),
    );
    const result = await request(app.getHttpServer())
      .post('/v1/auth/session')
      .set('x-device-id', 'browser-1')
      .set('User-Agent', 'Cart test browser')
      .send({ ownerUuid: randomUUID(), userUuid: randomUUID() })
      .expect(201);
    expect(result.body).toEqual({ userUuid: null, sessionUuid, expiresAt: expect.any(String) });
    expect(result.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(identity).toHaveBeenCalledWith(
      { cmd: 'identity.session.issueGuest' },
      expect.objectContaining({ gateway: 'client_gw' }),
    );
    expect(identity.mock.calls[0][1]).not.toHaveProperty('ownerUuid');
    expect(cartSend).not.toHaveBeenCalled();
  });

  it('allows a verified guest to use Cart without manufacturing a user or renewing from background reads', async () => {
    identity.mockReturnValue(of({ data: { ...active().data, status: 'renew_required', userId: null } }));
    await auth(request(app.getHttpServer()).get('/v1/cart')).expect(200);
    expect(cartSend).toHaveBeenCalledWith({ cmd: 'cart.get' }, { ownerUuid, shopUuid });
    expect(identity).toHaveBeenCalledTimes(1);
    const result = await auth(request(app.getHttpServer()).post('/v1/auth/socket-ticket')).expect(201);
    const claims = await new JwtService().verifyAsync(result.body.ticket, {
      secret: signingSecret,
      audience: 'realtime',
    });
    expect(claims).toMatchObject({ sid: sessionUuid, oid: ownerUuid, scope: 'carts' });
    expect(claims).not.toHaveProperty('sub');
    expect(identity.mock.calls.every(([pattern]) => pattern.cmd === 'identity.session.verify')).toBe(true);
  });

  it('extends the same guest session on foreground initialization', async () => {
    identity.mockImplementation(({ cmd }) =>
      of(
        cmd === 'identity.session.verify'
          ? { data: { ...active().data, userId: null } }
          : { uuid: sessionUuid, userId: null, ownerUuid, expiresAt: expiresAt(), sessionSecret: 'renewed-guest' },
      ),
    );
    const result = await auth(request(app.getHttpServer()).post('/v1/auth/session')).expect(201);
    expect(result.body).toMatchObject({ userUuid: null, sessionUuid });
    expect(result.headers['set-cookie'][0]).toContain('renewed-guest');
    expect(identity).toHaveBeenLastCalledWith(
      { cmd: 'identity.session.renew' },
      expect.objectContaining({ sessionSecret: secret }),
    );
  });

  it('preserves a guest on failed login and sends its cookie only to the trusted Identity transition', async () => {
    identity.mockReturnValue(throwError(() => ({ statusCode: 401, message: 'Invalid credentials' })));
    const result = await auth(request(app.getHttpServer()).post('/v1/auth/login'))
      .send({ login: 'wrong', password: 'wrong' })
      .expect(401);
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(identity).toHaveBeenCalledWith(
      { cmd: 'identity.auth.signIn' },
      expect.objectContaining({ sessionSecret: secret }),
    );
    expect(identity).toHaveBeenCalledTimes(1);
    expect(cartSend).not.toHaveBeenCalled();
  });

  it('does not replace a guest cookie or issue another owner when Identity is unavailable during bootstrap', async () => {
    identity.mockReturnValue(throwError(() => ({ statusCode: 503, message: 'Identity unavailable' })));
    const result = await auth(request(app.getHttpServer()).post('/v1/auth/session')).expect(503);
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(identity).toHaveBeenCalledTimes(1);
    expect(identity.mock.calls[0][0].cmd).toBe('identity.session.verify');
  });

  it('takes owner only from Identity and shop only from storefront configuration', async () => {
    const result = await auth(
      request(app.getHttpServer()).get(`/v1/cart?ownerUuid=${randomUUID()}&shopUuid=${randomUUID()}`),
    ).expect(200);
    expect(cartSend).toHaveBeenCalledWith({ cmd: 'cart.get' }, { ownerUuid, shopUuid });
    expect(result.body.ownerUuid).toBeUndefined();
    expect(result.body.uuid).toBe(cartUuid);
  });
  it('does not guess ownerUuid from userId when Identity omitted owner', async () => {
    const response = active();
    delete (response.data as Partial<typeof response.data>).ownerUuid;
    identity.mockReturnValue(of(response));
    await auth(request(app.getHttpServer()).get('/v1/cart')).expect(502);
    expect(cartSend).not.toHaveBeenCalled();
  });

  it('exposes availability and action flags without internal projection or checkout identifiers', async () => {
    cartSend.mockReturnValue(
      of({
        ...cart,
        items: [
          {
            recordUuid,
            offerUuid: null,
            productUuid: null,
            variantUuid: null,
            productName: null,
            variantName: null,
            article: null,
            clarifications: [],
            imageUuid: null,
            quantity: 1,
            version: '7',
            checkoutUuid: randomUUID(),
            available: 3,
            price: null,
            subtotal: null,
            reasons: ['checkout_in_progress'],
            message: 'Оформляется',
            canCheckout: false,
            canOpenProduct: false,
            canIncrease: false,
            canDecrease: false,
            canRemove: false,
            sourceVersions: { product: 1, store: 2, inventory: 3 },
          },
        ],
      }),
    );
    const result = await auth(request(app.getHttpServer()).get('/v1/cart')).expect(200);
    expect(result.body.shop).toEqual({ uuid: shopUuid, name: 'Центр' });
    expect(result.body.items[0]).toMatchObject({
      availableQuantity: 3,
      canRemove: false,
      reasons: ['checkout_in_progress'],
    });
    expect(result.body.items[0]).not.toHaveProperty('checkoutUuid');
    expect(result.body.items[0]).not.toHaveProperty('sourceVersions');
    expect(result.body.items[0]).not.toHaveProperty('available');
  });
  it('strips owner/shop/cart from add and binds every command to verified scope', async () => {
    await auth(request(app.getHttpServer()).post('/v1/cart/items'))
      .send({
        recordUuid,
        quantity: 2,
        ownerUuid: randomUUID(),
        shopUuid: randomUUID(),
        cartUuid: randomUUID(),
      })
      .expect(201);
    expect(cartSend).toHaveBeenCalledWith(
      { cmd: 'cart.item.add' },
      { recordUuid, quantity: 2, ownerUuid, shopUuid, idempotencyKey: expect.any(String) },
    );
    await auth(request(app.getHttpServer()).patch(`/v1/cart/items/${recordUuid}`))
      .send({ quantity: 2, version: '9007199254740993' })
      .expect(200);
    expect(cartSend).toHaveBeenLastCalledWith(
      { cmd: 'cart.item.setQuantity' },
      {
        recordUuid,
        quantity: 2,
        expectedItemVersion: '9007199254740993',
        ownerUuid,
        shopUuid,
        idempotencyKey: expect.any(String),
      },
    );
    await auth(request(app.getHttpServer()).delete(`/v1/cart/items/${recordUuid}`))
      .send({ version: '2' })
      .expect(200);
    expect(cartSend).toHaveBeenLastCalledWith(
      { cmd: 'cart.item.remove' },
      { recordUuid, expectedItemVersion: '2', ownerUuid, shopUuid, idempotencyKey: expect.any(String) },
    );
  });
  it('rejects invalid quantity and numeric versions before Cart', async () => {
    await auth(request(app.getHttpServer()).post('/v1/cart/items')).send({ recordUuid, quantity: 0 }).expect(400);
    await auth(request(app.getHttpServer()).patch(`/v1/cart/items/${recordUuid}`))
      .send({ quantity: 1, version: 2 })
      .expect(400);
    expect(cartSend).not.toHaveBeenCalled();
  });

  it('returns an explicitly named cart version after mutation', async () => {
    const result = await auth(request(app.getHttpServer()).patch(`/v1/cart/items/${recordUuid}`))
      .send({ version: '1', quantity: 2 })
      .expect(200);
    expect(result.body).toEqual({ cartUuid, recordUuid, cartVersion: '2', quantity: 2 });
  });

  it('owns internal request keys and treats separate HTTP calls as separate operations', async () => {
    const forgedKey = randomUUID();
    for (let attempt = 0; attempt < 2; attempt++) {
      await auth(request(app.getHttpServer()).post('/v1/cart/items'))
        .send({ recordUuid, quantity: 1, idempotencyKey: forgedKey })
        .expect(201);
    }
    const firstKey = cartSend.mock.calls[0][1].idempotencyKey;
    const secondKey = cartSend.mock.calls[1][1].idempotencyKey;
    expect(firstKey).not.toBe(forgedKey);
    expect(secondKey).not.toBe(forgedKey);
    expect(secondKey).not.toBe(firstKey);
  });
  it('rejects missing records and old version fields before Cart', async () => {
    await auth(request(app.getHttpServer()).post('/v1/cart/items'))
      .send({ commandId: recordUuid, quantity: 1 })
      .expect(400);
    await auth(request(app.getHttpServer()).delete(`/v1/cart/items/${recordUuid}`))
      .send({ expectedVersion: '1' })
      .expect(400);
    await auth(request(app.getHttpServer()).delete(`/v1/cart/items/${recordUuid}`))
      .send({ expectedItemVersion: '1' })
      .expect(400);
    expect(cartSend).not.toHaveBeenCalled();
  });

  it('issues a short-lived Cart-only ticket using the Identity owner', async () => {
    const result = await auth(request(app.getHttpServer()).post('/v1/auth/socket-ticket')).expect(201);
    const claims = await new JwtService().verifyAsync(result.body.ticket, {
      secret: signingSecret,
      audience: 'realtime',
    });
    expect(claims).toMatchObject({ sub: userUuid, sid: sessionUuid, oid: ownerUuid, scope: 'carts' });
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(60);
  });
  it('renews cookies while keeping the verified owner and stable session', async () => {
    identity.mockImplementation(({ cmd }) =>
      of(
        cmd === 'identity.session.verify'
          ? { data: { status: 'renew_required' }, meta: {} }
          : { uuid: sessionUuid, userId: userUuid, ownerUuid, expiresAt: expiresAt(), sessionSecret: 'renewed-secret' },
      ),
    );
    const result = await auth(request(app.getHttpServer()).get('/v1/cart')).expect(200);
    expect(result.headers['set-cookie'][0]).toContain('renewed-secret');
    expect(cartSend).toHaveBeenCalledWith({ cmd: 'cart.get' }, { ownerUuid, shopUuid });
  });
  it('recovers a concurrent renewal through previous-secret verification', async () => {
    identity
      .mockReturnValueOnce(of({ data: { status: 'renew_required' }, meta: {} }))
      .mockReturnValueOnce(of(null))
      .mockReturnValueOnce(of(active()));
    await auth(request(app.getHttpServer()).get('/v1/cart')).expect(200);
    expect(identity).toHaveBeenCalledTimes(3);
  });
  it('clears expired credentials and does not reach Cart', async () => {
    identity.mockReturnValue(of({ data: { status: 'expired' }, meta: {} }));
    const result = await auth(request(app.getHttpServer()).get('/v1/cart')).expect(401);
    expect(result.headers['set-cookie'][0]).toContain('Expires=Thu, 01 Jan 1970');
    expect(cartSend).not.toHaveBeenCalled();
  });
  it('preserves cookies on an Identity outage rather than treating it as logout', async () => {
    identity.mockReturnValue(throwError(() => ({ statusCode: 503, message: 'Identity unavailable' })));
    const result = await auth(request(app.getHttpServer()).get('/v1/cart')).expect(503);
    expect(result.headers['set-cookie']).toBeUndefined();
    expect(cartSend).not.toHaveBeenCalled();
  });
  it('revokes only client session on logout and keeps account carts', async () => {
    await auth(request(app.getHttpServer()).post('/v1/auth/logout')).expect(201);
    expect(identity).toHaveBeenCalledWith(
      { cmd: 'identity.session.revoke' },
      expect.objectContaining({ sessionSecret: secret, gateway: 'client_gw' }),
    );
    expect(cartSend).not.toHaveBeenCalled();
  });
  it('requires the browser binding headers with an account cookie', async () => {
    await request(app.getHttpServer()).get('/v1/cart').set('Cookie', `client.sid=${secret}`).expect(400);
    expect(cartSend).not.toHaveBeenCalled();
  });
});
