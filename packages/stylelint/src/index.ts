/** 公开工厂、原生继承对象与上游 Config 类型；不在入口实现合并逻辑。 */
import { zzjtnb } from './factory'

export { zzjtnb }
export type { Config } from 'stylelint'

/** 原生 extends 使用模块加载时的默认对象；需要当前 CWD 的项目通过工厂创建。 */
export default zzjtnb()
