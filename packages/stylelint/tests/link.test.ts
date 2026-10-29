/** 验证独立消费引擎不需要从自身依赖树加载共享包的语法模块。 */
import { execFile } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import { expect, it } from 'vitest'

it('vue、SCSS 和 HTML 使用共享包提供的解析器，支持检查与自动修复', async () => {
  const script = `
    import { registerHooks } from 'node:module'
    import assert from 'node:assert/strict'
    import stylelint from 'stylelint'
    import { zzjtnb } from '@zzjtnb/stylelint-config'

    // 模拟消费方没有内部语法依赖；共享包自身的静态导入仍走真实解析。
    registerHooks({ resolve(specifier, context, nextResolve) {
      if (['postcss-html', 'postcss-scss'].includes(specifier)
        && context.parentURL?.endsWith('/stylelint/lib/utils/dynamicImport.mjs')) {
        throw Object.assign(new Error('消费引擎不能解析共享包内部语法模块'), { code: 'ERR_MODULE_NOT_FOUND' })
      }
      return nextResolve(specifier, context)
    } })
    for (const [file, code] of [
      ['consumer.vue', '<template><div /></template>\\n<style scoped lang="scss">\\n.card { color: #ffffff; }\\n</style>\\n'],
      ['consumer.scss', '$color: #ffffff;\\n.card { color: $color; }\\n'],
      ['consumer.html', '<style>.card { color: #ffffff; }</style>\\n'],
    ]) {
      for (const fix of [false, true]) {
        const result = await stylelint.lint({ code, codeFilename: file, config: zzjtnb(), fix })
        assert.deepEqual(result.results[0].parseErrors, [])
        assert.equal(result.results[0].warnings.some(warning => warning.rule === 'CssSyntaxError'), false)
        if (fix) assert.match(result.code, /#fff(?:;|\\s)/)
      }
    }
  `
  // 通过公开构建入口运行真实引擎，避免仓库源码加载器掩盖发布边界。
  const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', script], {
    cwd: new URL('..', import.meta.url),
  })
  expect(stdout).toBe('')
  // 包含独立 Node 进程与完整插件冷启动，不作为 5 秒性能断言。
}, 30000)
