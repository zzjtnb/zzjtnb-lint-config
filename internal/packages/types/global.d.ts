import type { RouteMeta as IRouteMeta } from '@zzjtnb-core/typings'

import 'vue-router'

declare module 'vue-router' {
  // oxlint-disable-next-line typescript/no-empty-object-type
  interface RouteMeta extends IRouteMeta {}
}

export interface ZzjtnbLintConfigAppConfigRaw {
  VITE_GLOB_API_URL: string
  VITE_GLOB_AUTH_DINGDING_CLIENT_ID: string
  VITE_GLOB_AUTH_DINGDING_CORP_ID: string
}

interface AuthConfig {
  dingding?: {
    clientId: string
    corpId: string
  }
}

export interface ApplicationConfig {
  apiURL: string
  auth: AuthConfig
}

declare global {
  interface Window {
    _ZZJTNB_LINT_CONFIG_APP_CONF_: ZzjtnbLintConfigAppConfigRaw
  }
}
