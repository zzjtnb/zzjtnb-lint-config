/** 检查相对导入的显式后缀是否对应源码文件，不使用编译产物后缀替代源码。 */
import type { Rule } from 'eslint'
import { existsSync, readdirSync } from 'node:fs'
import { basename, dirname, extname, resolve } from 'node:path'

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: '显式导入后缀与实际源码文件一致；支持省略时优先省略。',
      url: 'https://github.com/zzjtnb/zzjtnb-lint-config/blob/main/docs/src/eslint/configuration.md#模块导入与源码扩展名',
    },
    schema: [],
    messages: {
      mismatch: '导入 {{imported}} 不存在，实际文件为 {{files}}。支持省略后缀时省略，否则使用真实源码后缀，并核对构建后的运行方式。',
    },
  },
  create(context) {
    // 声明文件描述发布后的模块契约，不将它们当作待编译的实现源码。
    if (/\.d\.[cm]?ts$/.test(context.physicalFilename))
      return {}
    return {
      Literal(node) {
        if (typeof node.value !== 'string' || !/^\.{1,2}\//.test(node.value))
          return
        // 只检查模块来源，不把普通配置字符串或资源路径变量当成导入语句。
        const kind: string = node.parent.type
        const moduleSource = [
          'ImportDeclaration',
          'ExportNamedDeclaration',
          'ExportAllDeclaration',
          'ImportExpression',
          'TSExternalModuleReference',
          'TSImportType',
        ].includes(kind)
        let required = node.parent.type === 'CallExpression'
          && node.parent.callee.type === 'Identifier'
          && node.parent.callee.name === 'require'
          && node.parent.arguments[0] === node
        // 只检查未被局部声明遮蔽的 require；同名函数的字符串参数不属于模块路径。
        if (required) {
          let scope: ReturnType<typeof context.sourceCode.getScope> | null = context.sourceCode.getScope(node)
          while (scope) {
            const variable = scope.set.get('require')
            if (variable) {
              required = variable.defs.length === 0
              break
            }
            scope = scope.upper
          }
        }
        if (!moduleSource && !required)
          return
        // 查询参数属于工具链指令，不是磁盘文件名的一部分。
        const requested = node.value.split(/[?#]/, 1)[0]!
        const extension = extname(requested)
        if (!extension)
          return
        const target = resolve(dirname(context.physicalFilename), requested)
        if (existsSync(target) || !existsSync(dirname(target)))
          return
        const stem = basename(target, extension)
        // 只有同一主文件名存在其他后缀时才能确定发生了后缀替代；全无目标交给编译器检查。
        const files = readdirSync(dirname(target), { withFileTypes: true })
          .filter(file => (file.isFile() || file.isSymbolicLink()) && basename(file.name, extname(file.name)) === stem)
          .map(file => file.name)
        if (!files.length)
          return
        // 不自动改写：NodeNext 等编译链路可能还需要同步扩展名重写选项。
        context.report({
          node,
          messageId: 'mismatch',
          data: {
            imported: node.value,
            files: files.join('、'),
          },
        })
      },
    }
  },
}

export default rule
