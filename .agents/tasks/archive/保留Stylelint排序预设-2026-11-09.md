# 保留Stylelint排序预设

- [x] T01 核对替代预设并按用户最新要求保留 Recess。
  - 结论：rational-order 0.1.2 依赖 Stylelint 9 与 stylelint-order 2；Stylelint 官方 awesome 列表同时收录 Recess 和 clean-order，不代表针对 18 的兼容声明。
  - 实现：撤回本轮 clean-order 依赖、catalog、源码、测试和文档替换；保留原有 Recess 7.10.0 及用户既有改动，未改变暂存范围。
- [x] T02 验证恢复后的公开包和工作台资源。
  - 证据：pnpm install --no-frozen-lockfile 成功；Stylelint 包 105 项测试和 typecheck 通过；工作台 generate 成功，构建和浏览器运行资源恢复使用 Recess。
  - 限制：上游 Recess 与 SCSS 相关包的 Stylelint 18 peer 声明告警仍保留；未执行浏览器测试。
