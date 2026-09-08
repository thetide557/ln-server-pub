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
