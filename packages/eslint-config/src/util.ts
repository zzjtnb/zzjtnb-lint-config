/** 表示动态 import 尚未解析或已经解析完成的模块值。 */
export type Awaitable<T> = Promise<T> | T

/**
 * 动态导入结果的返回类型。
 *
 * 传入命名导出名时返回对应导出；不传导出名时优先返回 default，
 * 这样所有配置工厂都可以复用同一个动态导入解包 helper。
 */
type InteropResult<
  T extends object,
  K extends keyof T | undefined,
> = K extends keyof T
  ? T[K]
  : T extends { default: infer U }
    ? U
    : T

/**
 * 统一解包动态导入结果。
 *
 * 这里只有一份实现；可选 key 通过泛型表达两种返回类型，避免维护三份
 * 看起来相同的同名函数声明。
 */
export async function interopDefault<
  T extends object,
  K extends keyof T | undefined = undefined,
>(
  module: Awaitable<T>,
  key?: K,
): Promise<InteropResult<T, K>> {
  const resolved = await module

  if (key !== undefined) {
    return resolved[key] as InteropResult<T, K>
  }

  if ('default' in resolved && resolved.default != null) {
    return resolved.default as InteropResult<T, K>
  }

  return resolved as InteropResult<T, K>
}
