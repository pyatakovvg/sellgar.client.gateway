# @gateway/client

`sellgar.client.gateway` - клиентский gateway для web-приложения интернет-магазина
`frontend/sellgar.ui.desktop`.

## Что здесь находится

- `code/src/main.ts` - HTTP bootstrap, CORS из `ORIGINS`, global validation pipe,
  exception filter и RMQ event microservice.
- `code/src/app.module.ts` - минимальная композиция client gateway.
- `code/src/api/health` - базовый health endpoint для проверки запуска.
- `code/src/common` - общая инфраструктура gateway, сейчас exception filter.
- `code/src/config` - валидация обязательных env keys.

## Правила изменений

- Не копируйте admin-only auth/session/CRUD endpoints в client gateway без
  отдельного публичного client contract.
- Client gateway должен быть edge/BFF слоем для публичного storefront API и не
  владеть доменной логикой product/store/shop services.
- При добавлении storefront endpoints сначала сверяйте сервис-владелец и DTO в
  соответствующем backend service.
- Не меняйте RMQ queues/exchange без проверки `.env` контракта и потребителей
  событий.

## Проверка

Основная проверка: `yarn build`.

## Учетные записи Store

Store API возвращает offers[].records[]: uuid, article, clarifications[]
(position/value) и inventory (recordUuid, quantity, reserved, available, version).
Артикул и остаток принадлежат учетной записи. У товара/связи варианта их нет.
Каталог — product_srv_v2; нельзя обращаться к прежнему product API или
возвращать старый offer_inventory контракт.

AMQP_PRODUCT_SRV_COMMAND_QUEUE должен адресовать текущий product_srv_v2.
Storefront /v1/products и /v1/offers/:uuid передают records[] для выбора
конкретной учетной записи клиентом. Cart находится в отдельной ветке cart_srv/v1; Order не реализован.

## Фильтры витрины

ProductsService берет обязательный shopUuid из STOREFRONT_SHOP_UUID и формирует
плоский query с productStatus/variantStatus=active,
productShowing/variantShowing=true и availableMin=1. StoreProductGateway валидирует
его и передает в Store для списка и карточки. Входящий search передается в тот же
query и использует FTS Store, включая артикулы. Публичный HTTP не разрешает
переопределить обязательные условия показа. Дополнительно BFF проверяет статусы
каталога у product_srv_v2. Политика витрины не зашивается в общий Store service.
STOREFRONT_SHOP_UUID обязателен и проверяется как UUID при запуске gateway.

Для списка и карточки Client gateway запрашивает Product с
`withEmptyProperties=false`. Product выбирает назначенные характеристики с
существующими значениями в БД. BFF и frontend не фильтруют поля повторно;
обычные admin-запросы и интеграционные снимки остаются полными.

## Категории карточки товара

`GET /v1/offers/:uuid` передаёт `categories` из Store рядом с `offer` и `siblingOffers`.
Каждый элемент — `{ categoryUuid, items: { uuid, name }[] }` с путём от корня до листа.
Store владеет деревом и собирает актуальные пути. Gateway не загружает дерево админки.
Без назначенных категорий контракт возвращает пустой массив.

`siblingOffers` включает текущее предложение первым; остальные доступные варианты
сохраняют порядок Store. Фронтенд не сортирует список повторно.

## Cart и сессии покупателей

- `code/src/api/identity_srv/v1`: login/session/logout и Cart socket-ticket; `code/src/api/cart_srv/v1`: собственная корзина и нормализация событий.
- Поддерживаются аккаунты и общие гостевые сессии посетителей; гостю не создаётся User. Не принимать ownerUuid из HTTP. POST /v1/auth/session инициализирует контекст независимо от Cart; GET /session и socket-ticket пассивны.
- Identity возвращает проверенные ownerUuid, userId, sessionId и expiresAt. Gateway не вычисляет ownerUuid из userId/sessionId.
- `/v1/cart` использует SessionGuard; shopUuid берется из STOREFRONT_SHOP_UUID. Контекст запроса: HttpOnly client cookie, User-Agent и стабильный x-device-id.
- Renewal сохраняет owner/session; outage не очищает cookie и не превращается в гостевой вход. Logout отзывает только текущую client_gw-сессию и не закрывает корзины аккаунта.
- `/v1/auth/socket-ticket` выдает ticket только для carts: sub=userUuid (у гостя sub отсутствует), sid=sessionUuid, oid=ownerUuid, scope=carts. TTL до 60 секунд и не дольше сессии Identity.
- Domain Cart events приходят в отдельную durable AMQP_CLIENT_GATEWAY_CART_EVENT_QUEUE с DLQ. В Socket публикуется только realtime.delivery.requested.v1, один адресат на запрос.
- Projection targets не попадают в payload клиента. Для fanout UUID v5(eventUuid, cartUuid) дает стабильные разные delivery IDs; schemaVersion=2 содержит полный публичный CartEntity из существующего cart.admin.getByUuid; owner/shop/uuid сверяются с target. Provider применяет Entity напрямую, без HTTP revalidation. owner, sourceVersions и checkoutUuid в публичный payload не попадают.
- Tests: yarn build; yarn test --runInBand. Полный изолированный smoke из workspace: node agent/scripts/smoke-client-cart-socket.cjs.

## Порядок учётных записей

- `AccountingRecord.order` — неотрицательное целое, уникальное внутри оффера. Store возвращает records по order; дата и UUID не задают отображение.
- Metadata-команда принимает order у записи; отсутствие сохраняет текущий порядок, новая запись без order добавляется в конец. Перестановка сохраняется атомарно с версией Store Product и событием; идентичность и остатки не меняются.

## Цена учётки

Цена и история находятся в records[].currentPrice / records[].prices, запись идентифицируется recordUuid.
Общей редактируемой цены оффера нет. priceRange (min/max/currency) приходит из Store;
BFF не рассчитывает собственный диапазон. Store Product schemaVersion=3, Inventory v2.
