import { Request } from 'express';

export interface ClientPrincipal {
  userUuid: string | null;
  ownerUuid: string;
  sessionUuid: string;
  expiresAt: string;
}
export interface ClientSessionContext {
  fingerprint: string;
  device: string;
  clientType: 'web';
  gateway: 'client_gw';
}
export type SessionRequest = Request & { principal?: ClientPrincipal };
