const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

const raw = {
  appEnv,
  apiEndpoint: process.env.EXPO_PUBLIC_API_ENDPOINT ?? '',
  apiSecret: process.env.EXPO_PUBLIC_API_SECRET ?? '',
  defaultActorName: process.env.EXPO_PUBLIC_DEFAULT_ACTOR_NAME ?? 'Activist',
};

export const env = {
  ...raw,
  hasRemoteBackend: Boolean(raw.apiEndpoint && raw.apiSecret),
  isDevelopment: raw.appEnv !== 'production',
} as const;

export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Pawfile';
export const DEVELOPER_NAME = 'Shortcut Sharva';
export const DEVELOPER_EMAIL = 'connect@sharva.xyz';
export const DEVELOPER_PHONE = '+91 7349771083';
