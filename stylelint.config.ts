import type { Config } from 'stylelint'
import { stylelintIgnoreFiles } from '@zzjtnb/stylelint-config'

export default {
  extends: [
    '@zzjtnb/stylelint-config',
  ],
  ignoreFiles: [
    ...stylelintIgnoreFiles,
    'packages/*/README*.md',
  ],
} satisfies Config
