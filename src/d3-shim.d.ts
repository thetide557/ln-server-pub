// N26 块 (B)（AI 浮窗升到 fe ee48e701）：装 streamdown@2.5.0 时，它的依赖 mermaid@11 把
// `@types/d3@7.4.3` 一起拉了进来（`awk '/^[^ ]/{blk=$0} /"@types\/d3" "/{print blk}' yarn.lock`
// → `mermaid@^11.12.2`；基线 yarn.lock 里没有 `@types/d3@`，`git show main-n9e:yarn.lock | grep -cE '^"@types/d3@'` = 0）。
//
// 这件事本身和 AI 浮窗无关，但它有个副作用：本仓库 `src/` 里原本就有 4 个文件 import 'd3'
// （src/pages/dashboard/Renderer/Renderer/{Stat,Hexbin}/index.tsx、Hexbin/render.ts、Gauge/Gauge.tsx，
// 以及 src/pages/sxxc/dashboardxc/ 下同名的 4 个），**以前 d3 根本没有类型**（node_modules 里只有
// 运行时包、没有 @types/d3），靠 tsconfig 的 `noImplicitAny: false` 当隐式 any 用，tsc 一句话不说。
// 现在 @types/d3 进了编译程序，它 `export * from 'd3-dispatch'`，而 `@types/d3-dispatch@3.0.7`
// 的 index.d.ts:91 用了 TypeScript 5.0 的「const 类型参数」语法（`const EventNames extends keyof any`），
// 本仓库 typescript 钉在 4.3.2（package.json:153）解析不了 → TS1139 / TS1005 / TS1109 / TS1011 / TS1128
// 共 10 条语法错；`skipLibCheck` 只跳过语义检查、不跳过语法解析，挡不住。
//
// 处置：照本仓库已有的三个先例（tsconfig.json 的 paths 里 `parse5`、`@antv/g2`、`streamdown`），
// 把 `d3` 的**类型**指到本文件，让 @types/d3 那一整串 .d.ts 根本不进编译程序。
// 这等于**把 d3 的类型恢复成装 streamdown 之前的样子**（没有类型、当 any 用），所以 src 里那 8 个
// 用 d3 的文件行为与基线完全一致，不会因为突然多出真类型而报新错
// （真类型还会撞上另一件事：d3 v7 已经没有 `event` 这个导出，而 Hexbin/render.ts:17 还在 import 它）。
// **只影响类型，不影响运行时**：vite / rollup 照旧从 node_modules 解析真正的 d3 与 mermaid。
// 不升级 typescript、不删 @types/d3（它是 mermaid 的依赖，手删会被下次 yarn install 装回来）。
//
// 写法说明：`import * as d3 from 'd3'`（整包取）和 `import { arc, event, min, select, transition } from 'd3'`
// （具名取，这 5 个是 src 里用到的全部具名导入，查法
// `grep -rhoE "import \{[^}]*\} from 'd3'" src --include=*.ts --include=*.tsx`）两种写法都要支持，
// 所以声明成一个「既有这 5 个成员、又带索引签名兜住其余任意成员」的对象，再 `export =` 出去。
// 将来 typescript 升到 5.0 以上，把本文件和 tsconfig.json 里那条 paths 一起删掉即可。

interface D3Module {
  /** d3-shape 的弧形生成器（Gauge/Gauge.tsx:18） */
  arc: any;
  /** d3 v6 之前的全局当前事件对象；d3 v7 已删，这里只为让老代码照旧编译（Hexbin/render.ts:17） */
  event: any;
  /** d3-array 的最小值（Hexbin/render.ts:17） */
  min: any;
  /** d3-selection 的选择器（Hexbin/render.ts:17） */
  select: any;
  /** d3-transition 的过渡（Hexbin/render.ts:17） */
  transition: any;
  /** 其余一律 any —— 和装 streamdown 之前「d3 没有类型」的状态一致 */
  [key: string]: any;
}

declare const d3: D3Module;
export = d3;
