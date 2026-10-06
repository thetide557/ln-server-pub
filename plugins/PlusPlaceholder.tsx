import React from 'react';

export default function PlusePlaceholder() {
  return null;
}

function AlertRule() {
  return null;
}

function QueryBuilder() {
  return null;
}

function datasource() {}

function Event() {
  return null;
}

function EventLogs() {
  return null;
}

function EventPreview() {
  return null;
}

function Explorer() {
  return null;
}

function Jobs() {
  return null;
}

const advancedCates = [];
const envCateMap = {};
enum AdvancedDatasourceCateEnum {}
const getLicense = async () => {
  return {};
};

export { AlertRule, QueryBuilder, datasource, Event, EventLogs, EventPreview, Explorer, Jobs, advancedCates, envCateMap, AdvancedDatasourceCateEnum, getLicense };

// ---- 第六步 L2（多数据源）：只在文件末尾追加，上面一个字没动。
// 新搬进来的 src/pages/explorer/components/RenderValue/useFieldConfig.tsx:7 用的是**具名** import
// （`import { searchDrilldown } from 'plus:/pages/LogExploreLinkSetting/services'`）。
// 默认 import 落到本文件的默认导出上不会报错，具名 import 找不到同名导出会让 rollup 打包直接失败，
// 所以这里补一个空实现。它只在 isPlus 为真时才会被调用（useFieldConfig.tsx:24 的 else 分支），
// 羚牛的开源形态下 isPlus 恒为 false，走不到。
async function searchDrilldown(_search?: any): Promise<any[]> {
  return [];
}

export { searchDrilldown };

// ---- n20 块 0（新日志浏览）：只在文件末尾追加，上面一个字没动。
// 新搬进来的 src/pages/logExplorer/components/LogsViewer/index.tsx:27 用的是**具名类型** import
// （fe 原文是 `import DrilldownBtn, { type DrilldownInitialValues } from 'plus:/pages/LogExploreLinkSetting/components/DrilldownBtn'`
// 这一行里的行内 type 修饰符是 TS 4.5 语法，羚牛 TS 4.3.2 读不懂，已拆成两行）。
// 形状照 fe ee48e701 src/global.d.ts:33-41 那个 declare module 里的真实定义逐字抄（羚牛的
// src/global.d.ts 里没有 plus: 的模块声明，只有 '*.md'）。
// `import type` 在编译后会被整行擦掉、不产生运行时 import，所以这个导出是防御性的：
// 将来有人把它改成值导入时，rollup 不会因为找不到同名导出而打包失败（R-06）。
export type DrilldownMode = 'list' | 'add' | 'edit' | 'clone';

export interface DrilldownInitialValues {
  cate?: string;
  datasource_id?: number;
  resource?: Record<string, any>;
  query?: any;
  logMode?: string;
  linkField?: string;
  linkName?: string;
  [key: string]: any;
}
