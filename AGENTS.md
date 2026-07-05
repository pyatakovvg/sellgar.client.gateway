# @gateway/client

`sellgar.client.gateway` - клиентский gateway для web-приложения интернет-магазина
`frontend/sellgar.ui.desktop`.

## Что здесь находится

- `src/main.ts` - HTTP bootstrap, CORS из `ORIGINS`, global validation pipe,
  exception filter и RMQ event microservice.
- `src/app.module.ts` - минимальная композиция client gateway.
- `src/api/health` - базовый health endpoint для проверки запуска.
- `src/common` - общая инфраструктура gateway, сейчас exception filter.
- `src/config` - валидация обязательных env keys.

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
