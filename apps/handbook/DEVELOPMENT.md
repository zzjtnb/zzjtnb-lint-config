# 开发笔记

## Git 操作

### 分支重命名

```bash
# 将本地默认分支从master重命名为main
git branch -m master main
# 获取远端分支与提交信息，不合并到当前分支。
git fetch origin
# 将本地 main 的上游设置为 origin/main。
git branch -u origin/main main
# 从远端识别并更新 origin 的默认分支指向。
git remote set-head origin -a
```

### 新建仓库

```bash
# 在命令行创建新仓库
echo "# zzjtnb-lint-config" >> README.md
# 初始化当前目录的 Git 仓库。
git init
# 将 README.md 加入 Git 暂存区。
git add README.md
# 将当前暂存内容创建为一次提交，使用指定提交说明。
git commit -m "first commit"
# 将当前分支重命名为示例中的 master。
git branch -M master
# 添加示例仓库的 origin 远端地址。
git remote add origin https://github.com/zzjtnb/zzjtnb-lint-config.git
# 将示例 master 分支推送到 origin 并建立上游跟踪。
git push -u origin master
```

### 关联已有仓库

```bash
# 关联本地仓库到远程
git remote add origin https://github.com/zzjtnb/zzjtnb-lint-config.git
# 将当前分支重命名为示例中的 master。
git branch -M master
# 将示例 master 分支推送到 origin 并建立上游跟踪。
git push -u origin master
```

### Git 提交合并(Squash)

#### 使用交互式变基(Interactive Rebase)

交互式变基允许你对提交历史进行精细控制,适合对合并过程有更精确要求的情况.

```bash
# 合并最近N次提交(N替换为数字,如3表示最近3次提交)
git rebase -i HEAD~N
```

操作步骤:

1. 执行命令后会打开编辑器
2. 将第一个提交保留为`pick`,其余改为`squash`或简写`s`
3. 保存并关闭编辑器,Git会再次打开编辑器让你编辑合并后的提交信息
4. 编辑完成后保存关闭即可

**示例:**

假设我们有以下提交历史:

```bash
# 按单行格式查看提交历史。
git log --oneline
abc1234 添加新特性的测试用例
def5678 实现新特性核心功能
ghi9101 修复代码风格问题
jkl1121 更新文档
```

执行合并最近4次提交的命令:

```bash
# 交互整理最近四次提交，会改写这些提交的历史。
git rebase -i HEAD~4
```

编辑器中会显示:

```bash
pick jkl1121 更新文档
pick ghi9101 修复代码风格问题
pick def5678 实现新特性核心功能
pick abc1234 添加新特性的测试用例

# 变基 xxxxxxx..xxxxxxx 到 xxxxxxx
#
# 命令:
# p, pick <提交> = 使用提交
# s, squash <提交> = 使用提交,但融合到前一个提交
```

修改为:

```bash
pick jkl1121 更新文档
s ghi9101 修复代码风格问题
s def5678 实现新特性核心功能
s abc1234 添加新特性的测试用例
```

保存后,Git会打开第二个编辑器让你编辑最终提交信息:

```bash
# 这是4个提交的组合
# 第一个提交信息是:
更新文档

# 这是第2个提交信息:
修复代码风格问题

# 这是第3个提交信息:
实现新特性核心功能

# 这是第4个提交信息:
添加新特性的测试用例
```

编辑为一个简洁的提交信息:

```bash
实现完整新特性

- 添加核心功能
- 完成测试
- 更新文档
- 修复样式问题
```

合并完成后,查看提交历史:

```bash
# 按单行格式查看提交历史。
git log --oneline
abcdef0 实现完整新特性
```

#### 使用git reset --soft方法

`git reset --soft` 方法提供了一种更简单的方式来合并多个提交,尤其适合将从某个特定提交之后的所有提交合并为一个新提交.

```bash
# 重置到目标提交,但保留所有更改
git reset --soft <目标提交哈希值>

# 创建包含所有更改的新提交
git commit -m "合并后的提交信息"

# 如果需要推送到远程仓库(谨慎使用)
git push --force
```

**示例:**

假设我们要将提交 `92e65f8` 之后的所有提交合并为一个:

```bash
# 查看提交历史
git log --oneline
abc1234 第三个提交
def5678 第二个提交
92e65f8 第一个提交

# 重置到第一个提交,但保留所有文件更改
git reset --soft 92e65f8

# 创建新的提交包含所有更改
git commit -m "合并92e65f8之后的所有提交"

# 查看结果
git log --oneline
xyz4567 合并92e65f8之后的所有提交
92e65f8 第一个提交
```

**注意事项:**

1. 此方法会重写历史,建议先创建备份分支:`git branch backup-branch`
2. 如果分支已推送到远程并被他人使用,强制推送会影响他人的工作,需提前沟通
3. 与交互式变基相比,此方法更简单但灵活性较低,无法保留部分提交

#### 使用merge命令的--squash参数

适用于将一个分支的所有提交合并为主分支上的一个提交.

```bash
# 切换到目标分支(如main分支)
git switch main

# 执行squash合并
git merge --squash feature-branch

# 提交变更
git commit -m "合并feature-branch的所有修改"
```

这种方法会将目标分支的所有变更作为暂存的修改,需要手动提交一次.

**示例:**

假设我们有两个分支:`main`和`feature-login`.`feature-login`分支有以下提交:

```bash
# 切换到 feature-login 分支。
git checkout feature-login
# 按单行格式查看提交历史。
git log --oneline
abc1234 添加登录表单验证
def5678 实现登录API集成
ghi9101 添加登录页面UI
```

现在要将所有这些更改作为一个提交合并到`main`分支:

```bash
# 切换到 main 分支。
git checkout main
# 将功能分支的改动合并到暂存区，等待单独创建汇总提交。
git merge --squash feature-login
```

执行后的输出:

```bash
自动合并 src/login.js
自动合并 src/api/auth.js
自动合并 src/components/LoginForm.vue
压缩提交 -- 未更新HEAD
自动合并成功
```

此时,所有更改已经添加到暂存区,但尚未提交.可以查看状态:

```bash
# 查看工作区和暂存区的修改状态。
git status
位于分支 main
要提交的变更:
  (使用 "git reset HEAD <文件>..." 以取消暂存)
 新文件:   src/api/auth.js
 修改:     src/components/LoginForm.vue
 新文件:   src/login.js
```

现在执行提交操作:

```bash
# 将当前暂存内容创建为一次提交，使用指定提交说明。
git commit -m "添加完整的用户登录功能"
[main abcdef0] 添加完整的用户登录功能
 3 files changed, 120 insertions(+), 2 deletions(-)
 create mode 100644 src/api/auth.js
 create mode 100644 src/login.js
```

最终,`main`分支的历史记录中只会显示一个新的合并提交.

#### 选择建议

- 如果需要对合并过程有更精细的控制(如选择性地保留某些提交),使用交互式变基
- 如果只是想把一个功能分支的所有改动合并为一次提交,使用`--squash`参数更简便
- 在Pull Request合并时,大多数代码托管平台(如GitHub)也提供squash选项

#### 与GitHub等平台集成

在GitHub的Pull Request界面中,可以选择"Squash and merge"选项,这会自动将PR中的所有提交合并为一个提交:

![GitHub Squash选项](https://docs.github.com/assets/cb-36544/images/help/pull_requests/select-squash-and-merge-from-drop-down-menu.png)

这种方式特别适合团队协作,确保主分支的提交历史保持干净和有意义.

## 软链接管理

本仓库根 README 和三个包的 README 各有职责，不通过软链接互相替代。下面只演示在临时目录创建链接；先确认目标文件存在、链接路径未被占用，不覆盖现有文件。

### 创建软链接

Windows 的 mklink 是 cmd 内建命令；创建符号链接通常需要管理员权限或启用开发者模式。Git 的 core.symlinks 只控制检出行为，不会授予创建链接的系统权限。

```cmd
REM 在仓库根目录执行；顺序是“链接文件、目标文件”。
if not exist .tmp\links mkdir .tmp\links
mklink .tmp\links\eslint-readme.md ..\..\packages\eslint-config\README.md
```

```bash
# 在仓库根目录执行；顺序是“目标文件、链接文件”。
mkdir -p .tmp/links
# 为原 README 创建符号链接，不复制文件内容。
ln -s ../../packages/eslint/README.md .tmp/links/eslint-readme.md
```

### 移除链接

先确认路径本身是符号链接，再移除链接条目；不要对真实 README 使用链接删除示例。

```powershell
# 检查链接类型；只有符号链接才移除。
$link = Get-Item -LiteralPath .tmp/links/eslint-readme.md
if ($link.LinkType -eq 'SymbolicLink') {
  # 仅删除已确认为符号链接的路径，不删除目标文件。
  Remove-Item -LiteralPath $link.FullName
}
```

```bash
# -L 检查链接本身，不跟随目标；unlink 只移除这个路径条目。
if [ -L .tmp/links/eslint-readme.md ]; then
  # 仅移除符号链接本身，保留原 README。
  unlink .tmp/links/eslint-readme.md
fi
```
