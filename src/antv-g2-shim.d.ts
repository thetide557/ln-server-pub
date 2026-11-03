// n20 块 0（新日志浏览）：@antv/g2 v5 自带的 .d.ts 用了 TS 4.5 的「行内 type 修饰符」语法
// （例：node_modules/@antv/g2/lib/api/index.d.ts:1 `export { Chart, type ChartOptions, … }`），
// 本仓库 typescript 是 4.3.2，读不懂就报 TS1005 语法错；`skipLibCheck` 只跳过语义检查、
// 不跳过语法解析，所以挡不住（第一次 tsc 的 22 条报错全是这一种，分布在
// @antv/g2 / @antv/g-lite / @antv/component 三个包的 7 个 .d.ts 里）。
//
// 处置：照本仓库已有的先例（tsconfig.json 里 parse5 那条 paths 映射，step6d(P2) 加的），
// 在 tsconfig.json 的 paths 里把 `@antv/g2` 的**类型**指到本文件，让那几个 .d.ts 根本不进
// 编译程序。**只影响类型，不影响运行时**：vite / rollup 照旧从 node_modules 解析真正的
// @antv/g2 5.4.8。不升级 typescript、不改 @antv/g2 的版本（统一尺子第三节「不许的改动」）。
//
// 本文件只声明闭包里真正用到的两个导出（唯一的使用处是
// src/pages/logExplorer/components/LogsViewer/components/TimeSeriesBarChart/index.tsx:2
// `import { register, Chart } from '@antv/g2'`），链式 API 一律放成 any。
// 代价：这一个文件里的 g2 调用失去类型检查（上游那些 .d.ts 本来也是 skipLibCheck 过的）。
// 将来 typescript 升到 4.5 以上，把本文件和 tsconfig.json 里那条 paths 一起删掉即可。

/** 往 g2 的注册表里塞自定义件（调色板、mark 等）。真实签名见 @antv/g2 的 api/library.d.ts */
export declare function register(key: string, component: any): void;

/** g2 v5 的图表对象。真实签名见 @antv/g2 的 api/chart.d.ts */
export declare class Chart {
  constructor(options?: any);
  [key: string]: any;
}
