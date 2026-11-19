# sellgar.client.gateway

`sellgar.client.gateway` - backend gateway для клиентского web-приложения
интернет-магазина `frontend/sellgar.ui.desktop`.

Gateway является edge/BFF слоем между storefront frontend и внутренними сервисами
Sellgar. Gateway предоставляет публичную витрину, сессии авторизованных покупателей, Cart API и нормализацию приватных Cart notifications.

## Зона ответственности

Gateway отвечает за:

- публичный HTTP API для `sellgar.ui.desktop`;
- преобразование request/response DTO публичного storefront API;
- вызовы downstream services через RabbitMQ или HTTP;
- единый HTTP response contract для client frontend.

Gateway не должен владеть доменной логикой сервисов, базами данных, storage,
RabbitMQ installation scripts или общей dev-инфрой workspace.

## Текущая структура

```text
.
├── code/                 # package.json, Yarn, src/, local .env
├── helm/
│   ├── values.app.yaml   # shared chart settings
│   ├── dev/values.yaml   # dev ConfigMap
│   └── prod/values.yaml  # production values, not activated yet
├── .github/              # CI and manual release promotion
├── Dockerfile
├── README.md
└── AGENTS.md
```

## Установка

Из каталога `code/`:

```bash
yarn install
```

Репозиторий использует Yarn 4.10.3 и `nodeLinker: node-modules`.

## Локальный запуск

Подготовить env:

```bash
cp .env.example .env
```

В `.env` укажите `STOREFRONT_SHOP_UUID` — UUID магазина из Shop service.
Он определяет магазин для списка и карточек предложений этой витрины.
Gateway не запускается без корректного UUID; публичный query не может изменить
эту привязку или снять обязательные ограничения активности, показа и наличия.

Запуск:

```bash
yarn start:dev
```

Ожидаемый локальный порт: `4030`.

Health endpoint:

```bash
curl http://localhost:4030/health
```

## Проверки

Минимальная проверка перед commit:

```bash
yarn build
```

## Корзина авторизованного покупателя

| HTTP | Назначение |
|---|---|
| POST `/v1/auth/login` | `{ login, password }`, проверка Identity и HttpOnly cookie |
| GET `/v1/auth/session` | Проверенный пользователь, sessionUuid, expiresAt |
| POST `/v1/auth/logout` | Отзыв текущей сессии без удаления корзины |
| POST `/v1/auth/socket-ticket` | Короткоживущий ticket только для Cart |
| GET `/v1/cart` | Корзина текущего владельца и магазина витрины |
| POST `/v1/cart/items` | `{ recordUuid, quantity }`, прибавление |
| PATCH `/v1/cart/items/:recordUuid` | `{ quantity, version }` |
| DELETE `/v1/cart/items/:recordUuid` | `{ version }` |

Все session/Cart запросы отправляются с `credentials: include`, User-Agent браузера
и стабильным `x-device-id`. Ключ устройства не является ownerUuid или credential.
Cookie задается через AUTH_COOKIE/AUTH_COOKIE_SECURE, HttpOnly, SameSite=Lax, Path=/;
срок ограничен сессией Identity. Вход, renewal и отзыв принадлежат Identity, gateway
адаптирует HTTP. При renewal используются существующая ротация и previous-secret grace.
Owner берется только из проверенного Identity ответа; отсутствующий owner дает 502,
а не подстановку userId. Публичный body/query не меняет магазин или владельца.
Ключ внутренней команды `idempotencyKey` создает gateway перед RMQ-вызовом;
HTTP-клиент его не передает. Повторный независимый HTTP-запрос — новая операция,
дедупликация защищает повторы внутренней команды. version — версия целевой позиции
из `items[].version`, передается десятичной строкой. Гостевые сессии поддерживаются через общую ветку Identity; Order отложен.

Cart события принимает отдельная очередь AMQP_CLIENT_GATEWAY_CART_EVENT_QUEUE
из AMQP_EVENTS_EXCHANGE. Поврежденные сообщения идут в `<queue>.dead`. До ACK
все адресные уведомления публикуются в `realtime.delivery.requested.v1`; повтор
частичного fanout безопасен благодаря стабильному UUID каждой целевой корзины.
Payload schemaVersion=2 содержит полный публичный CartEntity, идентичный GET /v1/cart.
Gateway читает его через существующий cart.admin.getByUuid, проверяет uuid/owner/shop
и исключает внутренние поля. Provider применяет Entity без HTTP-перезапроса.
Равная Cart.version не исключает обновление проекции; меньшая версия состава игнорируется.
ownerUuid находится только в серверном routing envelope; общий массив targets не
пересылается клиенту. Отдельный Socket.IO path — `/socket.io/carts`.

SOCKET_TICKET_SECRET и SOCKET_TICKET_AUDIENCE должны совпадать с Socket Gateway.
Ticket имеет `sub` пользователя, `sid` сессии, `oid` владельца и `scope=carts`;
он не дает доступа к административным broadcast-каналам.

Проверка: `yarn build`, `yarn test --runInBand`. В workspace полный HTTP/RMQ/Socket
smoke запускается `node agent/scripts/smoke-client-cart-socket.cjs`; он использует
временные схемы/аккаунты/очереди и читает действующие Shop/Product/Store без изменений.

HTTP Cart возвращает availableQuantity и cartVersion в результате записи.
В публичной карточке нет sourceVersions, shop.sourceVersion и checkoutUuid.
Поле version в PATCH/DELETE адаптируется gateway к внутреннему запросу Cart.


## Общая гостевая сессия

POST /v1/auth/session сохраняет аккаунт или создаёт/продлевает гостя через Identity.
GET /v1/auth/session пассивен и не создаёт сессию. Публичный результат:
{sessionUuid, userUuid: UUID | null, expiresAt}; owner/credentials/hash не возвращаются.
Используются существующая persistent HttpOnly cookie и x-device-id привязка.
Недоступность Identity не очищает cookie и не создаёт нового владельца.

Cart работает с проверенным ownerUuid как у гостя, так и у аккаунта. Гостевые
пассивные Cart reads и socket tickets не продлевают inactivity; foreground bootstrap
продлевает через Identity renew. Ticket гостя не содержит sub и имеет scope=carts.
Login передаёт текущий cookie secret только в Identity для атомарного перехода;
gateway не закрывает корзины и не объединяет данные. Logout отзывает сессию и
очищает cookie; приложение инициализирует нового гостя. CORS должен включать
origin витрины; локальный порт Desktop — 3100.

## Kubernetes deployment

Sources and local `.env` are under `code/`. Run Yarn commands from `code/`.
`Dockerfile` builds Node.js 24 production output; aliases are resolved during build.
The image contains no environment credentials. Kubernetes mounts the environment's
ConfigMap as `/app/.env`; Secrets are injected with `secretKeyRef` and take precedence.
`helm/values.app.yaml` uses the shared infrastructure chart; `helm/dev/values.yaml`
owns public dev configuration. PostgreSQL migrations run once as an Argo Sync Job
before Socket deployment, after its ConfigMap exists. Other gateways have no DB.
Only Traefik exposes the gateway; service and broker addresses stay inside Kubernetes.
