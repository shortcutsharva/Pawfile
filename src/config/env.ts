const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

const raw = {
  appEnv,
  sheetsEndpoint: process.env.EXPO_PUBLIC_SHEETS_ENDPOINT ?? '',
  sheetsSecret: process.env.EXPO_PUBLIC_SHEETS_SECRET ?? '',
  demoMode:
    (process.env.EXPO_PUBLIC_DEMO_MODE ?? (appEnv === 'production' ? 'false' : 'true')).toLowerCase() !==
    'false',
  defaultActorName: process.env.EXPO_PUBLIC_DEFAULT_ACTOR_NAME ?? 'Activist',
};

export const env = {
  ...raw,
  hasRemoteBackend: Boolean(raw.sheetsEndpoint && raw.sheetsSecret),
  isDevelopment: raw.appEnv !== 'production',
} as const;

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Animal Welfare';
export const DEVELOPER_NAME = 'Shortcut Sharva';
export const DEVELOPER_EMAIL = 'connect@sharva.xyz';
export const DEVELOPER_PHONE = '+91 7349771083';
