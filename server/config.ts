import dotenv from 'dotenv';

dotenv.config({ quiet: true });

function str(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

function bool(name: string): boolean {
  return /^(1|true|yes|on)$/i.test(process.env[name] ?? '');
}

export const config = {
  port: Number(process.env.PORT ?? 8080),
  isProduction: process.env.NODE_ENV === 'production',
  appName: str('APP_NAME') ?? 'CAD2BIM',

  databaseUrl: str('DATABASE_URL'),
  databaseSsl: bool('DATABASE_SSL'),
  /** Optional Postgres schema to use instead of `public` (handy for isolated testing). */
  databaseSchema: str('DATABASE_SCHEMA'),

  /** Optional shared password. When set, the whole dashboard sits behind HTTP Basic auth. */
  basicAuthUser: str('BASIC_AUTH_USER') ?? 'admin',
  basicAuthPassword: str('BASIC_AUTH_PASSWORD'),

  /** Sign-in accounts. An account is only enabled when its password is set. */
  accounts: [
    { username: str('TRACKER_ADMIN_USERNAME') ?? 'admin', password: str('TRACKER_ADMIN_PASSWORD'), role: 'admin' as const },
    { username: str('TRACKER_VIEWER_USERNAME') ?? 'viewer', password: str('TRACKER_VIEWER_PASSWORD'), role: 'viewer' as const },
  ].filter((account): account is Account => !!account.password),
  /** Optional extra secret mixed into session signatures. */
  sessionSecret: str('TRACKER_SESSION_SECRET') ?? '',
};

export type Role = 'admin' | 'viewer';
export type Account = { username: string; password: string; role: Role };

export type AppConfig = typeof config;
