/** 发布流程共享的数据契约，不包含执行逻辑。 */
export interface RegistryVersions {
  remote?: string
  publishedVersions: string[]
  unpublishedVersions: string[]
}

export interface PackageState extends RegistryVersions {
  name: string
  local: string
  notFound?: boolean
}

export interface MenuOption<Key extends string = string> {
  key: Key
  label: string
  description: string
}
