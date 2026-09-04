// Stylelint 的配置文件：`zzjtnb()` 返回完整配置，已包含 CSS、SCSS、Vue 样式与 UnoCSS 指令的处理。
import { zzjtnb } from '@zzjtnb/stylelint-config'

// 需要追加项目自己的规则或忽略路径时，把它们作为参数传入，例如 `zzjtnb({ ignoreFiles: ['**/generated/**'] })`。
export default zzjtnb()
