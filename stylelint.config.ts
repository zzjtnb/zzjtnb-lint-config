import {
  createStylelintIgnoreFiles,
  stylelintIgnoreFiles,
} from '@zzjtnb/stylelint-config'

export default {
  extends: [
    '@zzjtnb/stylelint-config',
  ],
  ignoreFiles: [
    ...stylelintIgnoreFiles,
    ...createStylelintIgnoreFiles({ globs: ['**/backup/**'] }),
    'packages/*/README*.md',
  ],
}
