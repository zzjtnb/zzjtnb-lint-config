import type { Config } from 'stylelint'
import { stylelintIgnoreFiles } from 'stylelint-config-zzjtnb'

export default {
  extends: [
    'stylelint-config-zzjtnb',
  ],
  ignoreFiles: [
    ...stylelintIgnoreFiles,
    'packages/*/README*.md',
  ],
} satisfies Config
