// N26 块 (B)（AI 浮窗升到 fe ee48e701）：streamdown@2.5.0 是上游浮窗用来流式渲染 markdown 的包。
// 它自己的 node_modules/streamdown/dist/index.d.ts 没有新语法，但它 import 了 mermaid / remend /
// shiki 这一串包的类型，那些 .d.ts 用了 TypeScript 4.4+ 的语法（联合类型前置 `|`、行内 type 修饰符等），
// 本仓库 typescript 钉在 4.3.2（package.json:153），读不懂就报 TS1005 / TS1109 / TS1128 语法错；
// `skipLibCheck` 只跳过语义检查、不跳过语法解析，所以挡不住。
// 实测（阶段 3 的 tsc 日志 第六步-流水线/n26/审阅/tsc-W-B-3.log）：259 条报错 0 条在 src/ 下，
// 全部落在 node_modules 的 .d.ts 上 —— type-fest 160 条、streamdown/dist/index.d.ts 29 条、
// @iconify/utils 23 条、@types/d3-dispatch 10 条、remend 3 条，整条链都是从 streamdown 的类型引进来的。
//
// 处置：照本仓库已有的两个先例（tsconfig.json 的 paths 里 `parse5` 那条，step6d(P2) 加的；
// `@antv/g2` 那条，n20 块 0 加的），把 `streamdown` 的**类型**指到本文件，让那一串 .d.ts 根本不进
// 编译程序。**只影响类型，不影响运行时**：vite / rollup 照旧从 node_modules 解析真正的
// streamdown 2.5.0（还带着 patches/streamdown+2.5.0.patch 那两处 React 17 垫片）。
// 不升级 typescript、不改 streamdown 版本（统一尺子第四节末尾「不许的改动」）。
//
// 本文件只声明闭包里真正用到的两个导出 —— 唯一的使用处是
// src/components/AiChatNG/StreamingMarkdown.tsx:7 `import { Streamdown, useIsCodeFenceIncomplete } from 'streamdown'`。
// 签名照 node_modules/streamdown/dist/index.d.ts 抄：`Streamdown` 见 :490 与 `StreamdownProps` :410-458，
// `useIsCodeFenceIncomplete` 见 :263。只写 StreamingMarkdown.tsx 真的传的那几个 prop（其余放 `[key: string]: any`
// 兜住，上游将来加 prop 不会在这里报错），`components` 放成宽松的映射（真实类型 `Components` 来自
// react-markdown，它的 .d.ts 也在读不懂的那串里）。
// 代价：这一个文件里对 streamdown 的调用失去类型检查（上游那些 .d.ts 本来也是 skipLibCheck 过的）。
// 将来 typescript 升到 4.5 以上，把本文件和 tsconfig.json 里那条 paths 一起删掉即可。

import * as React from 'react';

/** 代码围栏还没闭合（流还在往里写）时为真；闭合后才做语法高亮。真实签名见 streamdown/dist/index.d.ts:263 */
export declare const useIsCodeFenceIncomplete: () => boolean;

/** `controls` 的真实类型见 streamdown/dist/index.d.ts:372-388（布尔或按 table / code / mermaid 分别开关） */
export type StreamdownControlsConfig =
  | boolean
  | {
      table?: boolean | { copy?: boolean; download?: boolean; fullscreen?: boolean };
      code?: boolean | { copy?: boolean; download?: boolean };
      mermaid?: boolean | { download?: boolean; copy?: boolean; fullscreen?: boolean; panZoom?: boolean };
    };

/** `linkSafety` 的真实类型见 streamdown/dist/index.d.ts:395-399 */
export interface StreamdownLinkSafetyConfig {
  enabled: boolean;
  onLinkCheck?: (url: string) => Promise<boolean> | boolean;
  renderModal?: (props: any) => React.ReactNode;
}

/** 只列 StreamingMarkdown.tsx 真的传的 prop，其余由索引签名兜住。真实类型见 streamdown/dist/index.d.ts:410-458 */
export interface StreamdownShimProps {
  children?: React.ReactNode;
  /** 'streaming' 时边收边渲染，'static' 时一次渲染完 */
  mode?: 'static' | 'streaming';
  /** 正在流式输出（控制光标与动画） */
  isAnimating?: boolean;
  /** 覆盖各 markdown 节点的渲染组件。真实类型是 react-markdown 的 `Components` */
  components?: Record<string, any>;
  className?: string;
  controls?: StreamdownControlsConfig;
  /** 代码块要不要显示行号 */
  lineNumbers?: boolean;
  linkSafety?: StreamdownLinkSafetyConfig;
  [key: string]: any;
}

/** 流式 markdown 渲染组件。真实签名见 streamdown/dist/index.d.ts:490（是个 React.memo 包出来的组件） */
export declare const Streamdown: React.MemoExoticComponent<(props: StreamdownShimProps) => JSX.Element>;
