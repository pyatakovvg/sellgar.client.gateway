import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';

@Injectable()
export class SessionCookieService {
  constructor(private readonly config: ConfigService) {}
  read(req: Request): string | undefined {
    const name = this.config.getOrThrow<string>('AUTH_COOKIE') + '=';
    const value = req.headers.cookie
      ?.split(';')
      .map((v) => v.trim())
      .find((v) => v.startsWith(name));
    if (!value) return undefined;
    try {
      return decodeURIComponent(value.slice(name.length));
    } catch {
      return undefined;
    }
  }
  set(res: Response, secret: string, expiresAt: string): void {
    res.cookie(this.config.getOrThrow<string>('AUTH_COOKIE'), secret, {
      ...this.options(),
      maxAge: Math.max(0, Date.parse(expiresAt) - Date.now()),
    });
  }
  clear(res: Response): void {
    res.clearCookie(this.config.getOrThrow<string>('AUTH_COOKIE'), this.options());
  }
  private options() {
    return {
      httpOnly: true,
      secure: this.config.getOrThrow<boolean>('AUTH_COOKIE_SECURE'),
      sameSite: 'lax' as const,
      path: '/',
    };
  }
}
