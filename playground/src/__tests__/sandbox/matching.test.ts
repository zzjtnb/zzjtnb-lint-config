import { expect, it } from 'vitest'
import { execute } from '../../../sandbox/eslint'

it('配置匹配保留 AND 文件条件、局部忽略和最后覆盖序号', async () => {
  const url = `data:text/javascript,${encodeURIComponent(`export default [{name:'global',rules:{'no-console':'warn'}},{name:'source',files:[['src/**','**/*.js']],ignores:['**/generated/**'],rules:{'no-console':'error'}}]`)}`
  const request = {
    mode: 'eslint' as const,
    filename: 'src/main.js',
    source: 'console.log(1)',
    config: '',
    overrides: {},
    action: 'inspect' as const,
  }
  const matched = await execute(request, url)
  expect(matched.matchedConfigs).toContain(2)
  expect(matched.rules['no-console']).toEqual([2, {}])
  const ignored = await execute({ ...request, filename: 'src/generated/main.js' }, url)
  expect(ignored.matchedConfigs).not.toContain(2)
  expect(ignored.rules['no-console']).toEqual([1, {}])
})
