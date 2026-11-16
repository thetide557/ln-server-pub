/**
 * N36 追加批 I（第十一份第 7 条 / 后端 FEC-07、`DS-DASH-RAW-04`）·
 * 表格图在 raw 数据下不再多出一列空的 `value`。
 *
 * 要证的事（两层）：
 *  1. 纯函数层 —— `isRawData(series)` 只在 series 第一条的 `target.query.mode === 'raw'`
 *     时为真（和上游 `v9.1.0` 逐字相同的判法）；
 *  2. 渲染层 —— 「标签模式」（`displayMode === 'labelsOfSeriesToRows'`）下，
 *     raw 数据的表头**不含** `value` 一列；时序数据的表头**仍含** `value`。
 *
 * 背景：表格图的标签模式本来是把每条序列的标签铺成列、再固定补一列 `value`（放算出来的统计值）。
 * raw 数据（mysql / ck / doris / pgsql 的 `mode: 'raw'` 查询，以及日志）没有时间序列、`data` 是空数组，
 * 统计值算出来是 `NaN`，于是那一列永远是空的。上游 v9 为此加了 `isRawData` 开关，
 * 版本 A 当时没搬，后端第十一份第 7 条建议补搬。
 *
 * 上游出处（本批逐字搬）：
 *   - 函数：`git -C fe show v9.1.0:src/pages/dashboard/Renderer/Renderer/Table/utils.ts | sed -n '76,88p'`
 *   - 两处调用：同文件 `index.tsx` 的 `:130` 与 `:258`（羚牛落在 `:120` 与 `:220`）。
 *
 * 一个要先说清的事实（见 `n36/拿不准-I1.md` U-I1-02）：这个判法读的是 series 第一条的
 * `target.query.mode`。四个 SQL 插件造 raw series 时都带了 `target`（例
 * `src/plugins/mysql/Dashboard/datasource.tsx:93-99`），所以判得出来；但 **es 的 raw series
 * 不带 `target`**（`src/pages/dashboard/Renderer/datasource/elasticsearch/query.ts:267-273`），
 * 对 es raw 会判成 false、表头仍多一列空 `value`。上游 `v9.1.0` 的 es raw 构造一字相同、
 * 同样不带 `target`，所以这是上游自己的缺口，本批照上游逐字搬、不自己扩大判法；
 * 下面用例 3 就把「es raw 这条路现在是什么行为」钉住，将来真要补（候选
 * `FE-DASH-RAW-ES-VALUE-01`）时这条用例会红，提醒改的人一起改它。
 */
import React from 'react';
import { render } from '@testing-library/react';

// antd 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/。
jest.mock('antd/es/table', () => require('antd/lib/table'));
jest.mock('antd/es/table/interface', () => require('antd/lib/table/interface'));

import TableRenderer from '@/pages/dashboard/Renderer/Renderer/Table';
import { isRawData } from '@/pages/dashboard/Renderer/Renderer/Table/utils';

// 一条 raw series：照 `src/plugins/mysql/Dashboard/datasource.tsx:93-99` 的形状
//（`data` 是空数组、`metric` 是一行 SQL 结果、`target.query.mode === 'raw'`）。
const rawSeries = [
  {
    id: 'series_1',
    target: { refId: 'A', query: { mode: 'raw', query: 'select 1' } },
    metric: { host: 'db-01', cnt: '12' },
    data: [],
    mode: 'raw',
  },
];

// 一条时序 series：照 `src/pages/dashboard/Renderer/datasource/queryBatchV2.ts:107-117` 的形状。
const tsSeries = [
  {
    id: 'A:series:1',
    refId: 'A',
    name: 'up{instance="db-01"}',
    metric: { __name__: 'up', instance: 'db-01' },
    data: [
      [1760000000, 1],
      [1760000060, 1],
    ],
    mode: 'timeSeries',
    target: { refId: 'A', query: { mode: 'timeSeries' } },
  },
];

// es 的 raw series：`metric` 是一条文档的字段，**没有 target**
//（`src/pages/dashboard/Renderer/datasource/elasticsearch/query.ts:267-273`）。
const esRawSeries = [
  {
    id: 'doc-1',
    name: 'logstash-2026.10.12',
    metric: { '@timestamp': '2026-10-12 16:00:00', message: 'hello' },
    data: [],
    mode: 'raw',
  },
];

const panelValues = {
  custom: {
    displayMode: 'labelsOfSeriesToRows',
    calc: 'lastNotNull',
    showHeader: true,
  },
  options: {},
  overrides: [],
} as any;

/** 把渲染出来的表头文字取成数组。 */
function headerTexts(container: HTMLElement) {
  return Array.from(container.querySelectorAll('thead th')).map((th) => (th.textContent || '').trim());
}

describe('N36-I · 表格图 raw 数据不再多一列空 value', () => {
  // ---- 第一层：纯函数 ----
  it('用例 1：isRawData 只认 series 第一条的 target.query.mode === "raw"', () => {
    expect(isRawData(rawSeries)).toBe(true);
    expect(isRawData(tsSeries)).toBe(false);
    // 空数组、以及没有 target 的条目一律为 false（上游原样的兜底）
    expect(isRawData([])).toBe(false);
    expect(isRawData(esRawSeries)).toBe(false);
  });

  // ---- 第二层：渲染出来的表头 ----
  it('用例 2：raw 数据的表头只有标签列，不含 value', () => {
    const { container } = render(<TableRenderer values={panelValues} series={rawSeries} />);
    const headers = headerTexts(container);
    expect(headers).toEqual(expect.arrayContaining(['host', 'cnt']));
    expect(headers).not.toContain('value');
  });

  it('用例 3（钉住现状）：es 的 raw series 不带 target，所以仍会多一列 value —— 与上游 v9.1.0 一致；真要补 FE-DASH-RAW-ES-VALUE-01 时这条会红', () => {
    const { container } = render(<TableRenderer values={panelValues} series={esRawSeries} />);
    expect(headerTexts(container)).toContain('value');
  });

  it('用例 4：时序数据的表头仍含 value（该不变的没被改坏）', () => {
    const { container } = render(<TableRenderer values={panelValues} series={tsSeries} />);
    const headers = headerTexts(container);
    expect(headers).toEqual(expect.arrayContaining(['__name__', 'instance']));
    expect(headers).toContain('value');
  });
});
