import { isUUID } from 'class-validator';

type EnvConfig = Record<string, unknown>;

const requiredStringKeys = [
  'ORIGINS',
  'AMQP_HOSTNAME',
  'AMQP_USERNAME',
  'AMQP_PASSWORD',
  'AMQP_CLIENT_GATEWAY_EVENT_QUEUE',
  'AMQP_CLIENT_GATEWAY_EXCHANGE',
  'AMQP_STORE_SRV_COMMAND_QUEUE',
  'AMQP_PRODUCT_SRV_COMMAND_QUEUE',
  'API_MEDIA_SRV',
  'STOREFRONT_SHOP_UUID',
  'AMQP_CART_SRV_COMMAND_QUEUE',
  'AMQP_IDENTITY_SRV_COMMAND_QUEUE',
  'AMQP_CLIENT_GATEWAY_CART_EVENT_QUEUE',
  'AMQP_EVENTS_EXCHANGE',
  'AUTH_COOKIE',
  'SOCKET_TICKET_SECRET',
  'SOCKET_TICKET_AUDIENCE',
];

const requiredNumberKeys = ['PORT', 'AMQP_PORT'];

function requireString(config: EnvConfig, key: string): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value.trim();
}

function requireNumber(config: EnvConfig, key: string): number {
  const value = config[key];
  const numberValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }

  return numberValue;
}

export function validateEnv(config: EnvConfig) {
  const validatedConfig = { ...config };

  for (const key of requiredStringKeys) {
    validatedConfig[key] = requireString(config, key);
  }

  for (const key of requiredNumberKeys) {
    validatedConfig[key] = requireNumber(config, key);
  }

  if (!isUUID(String(validatedConfig.STOREFRONT_SHOP_UUID))) {
    throw new Error('Environment variable STOREFRONT_SHOP_UUID must be a UUID');
  }

  const origins = String(validatedConfig.ORIGINS)
    .split(';')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    throw new Error('Environment variable ORIGINS must contain at least one origin');
  }

  if (
    validatedConfig.AUTH_COOKIE_SECURE !== true &&
    validatedConfig.AUTH_COOKIE_SECURE !== false &&
    validatedConfig.AUTH_COOKIE_SECURE !== 'true' &&
    validatedConfig.AUTH_COOKIE_SECURE !== 'false'
  ) {
    throw new Error('AUTH_COOKIE_SECURE must be true or false');
  }
  validatedConfig.AUTH_COOKIE_SECURE =
    validatedConfig.AUTH_COOKIE_SECURE === true || validatedConfig.AUTH_COOKIE_SECURE === 'true';
  if (String(validatedConfig.SOCKET_TICKET_SECRET).length < 32)
    throw new Error('SOCKET_TICKET_SECRET must contain at least 32 characters');

  return validatedConfig;
}
