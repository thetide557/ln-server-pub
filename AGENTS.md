# B frontend 项目仓库

一律使用新加坡简体中文；代码、命令、路径、标识符、专有名词保持原文。

开工前先读 `../../AGENTS.md`。本仓库是 B 的独立 frontend Git 对象仓，日常源码树为本目录；B 的备份、迁移记录、映射和本地依赖只放 `../../local/`，不进 Git。

- 项目主线为 `project/p001/main`；迁入时的原始 tip 永久保留在 `refs/archive/p001/imported-main`。
- `refs/archive/p001/legacy-api-2455aad2` 只是用户批准的历史归档，不合入项目主线。
- `standard-source` 只精确跟踪 A 的 `main-ln-server`，不取全部 tag 或其它分支；将标品更新并入项目前先单独审查。
- 本次迁仓不改业务前缀；当前项目代码的主要后端入口仍是 `/api/takin/*`。
- 禁止 `git checkout` / `switch` / `stash` / `reset`；未获用户新授权不 push、不部署、不连现场、不生成最终生产包。
- 原始迁入树可用 `git show refs/archive/p001/imported-main:<path>` 读取；不改写原始提交历史。

修改前读 `ARCHITECTURE.md` 和 `doc-deepwiki/` 中的对应模块。`package.json` 现有 `test` 脚本；不臆造 lint 脚本。全量 `build` 需要 8 GiB Node 内存上限，必须按 B 根规则核资源并持有 `../../local/locks/build.lock`；资源不足时先做静态和定点验证，不伪报 build PASS。
