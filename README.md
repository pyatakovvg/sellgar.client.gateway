# sellgar.client.gateway

`sellgar.client.gateway` - backend gateway для клиентского web-приложения
интернет-магазина `frontend/sellgar.ui.desktop`.

Gateway является edge/BFF слоем между storefront frontend и внутренними сервисами
Sellgar. Текущий baseline intentionally минимальный: HTTP bootstrap, env
validation, CORS, общий exception filter, RMQ подключение и `/health`.

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
├── package.json
├── .env.example
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── api/
│   ├── common/
│   └── config/
└── AGENTS.md
```

## Установка

Из корня репозитория:

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
