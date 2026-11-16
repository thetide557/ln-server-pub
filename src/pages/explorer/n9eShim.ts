/**
 * 第六步 L2（多数据源）：这不是 fe v9.1.0 的文件，是本轮补的垫片（shim）。
 *
 * 为什么要它：新搬进来的 `src/pages/explorer/components/Links.tsx:6` 原本写的是
 * `import { basePrefix } from '@/App'`，而羚牛的 `src/App.tsx` 没有这个导出——
 * 羚牛前端不带路径前缀（全仓 0 处 `VITE_PREFIX`，`<Router>` 也没有 `basename`）。
 * 任务书写死不许改 `App.tsx`，所以在这里给一个同名常量，值照 fe v9.1.0 `src/App.tsx:135` 抄，
 * 只把 Links.tsx 那一行 import 改成指向本文件。
 */
export const basePrefix = (import.meta as any).env?.VITE_PREFIX || '';
