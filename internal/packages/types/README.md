# @zzjtnb/types

用于多个 `app` 公用的工具类型，继承了 `@zzjtnb-core/typings` 的所有能力。业务上有通用的类型定义可以放在这里。

## 用法

### 添加依赖

```bash
# 这是私有 workspace 包；在需要这些类型的应用目录中添加开发依赖。
pnpm add -D @zzjtnb/types@workspace:*
```

### 使用

```ts
// 推荐加上 type
import type { SelectOption } from '@zzjtnb/types';
```
