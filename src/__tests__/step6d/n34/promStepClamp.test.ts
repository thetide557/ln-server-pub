/**
 * N34 批 step · prometheus 仪表盘取数的「步长夹取」。
 *
 * 要证的事（两层）：
 *  1. 纯函数层 —— `adjustStep(step, minStep, range)` 和 fe 基线逐字同义：
 *     结果 = max(算出来的步长, 下限, ceil(时间范围 / 11000))，不满 1 秒的那一项不取整；
 *  2. 取数链路层 —— `prometheusQuery` 真正发给后端的 `queries[].step`，在
 *     **三处 `_step` 来源**（面板默认 240 点算法、`target.time` 重算、`target.step` 自填）
 *     之后都被夹过一次。
 *
 * 背景：prometheus 对一次 range query 返回的点数有 11000 的硬上限，超了回
 * `exceeded maximum resolution of 11,000 points per timeseries`。fe 基线在前端夹，
 * 羚牛这份 `prometheus.ts`（羚牛第一个提交起没动过）原来只有 240 点算法、最小 1 秒。
 * 上游出处：`git -C fe show v9.1.0:src/pages/dashboard/Renderer/datasource/prometheus.ts`
 * 的 `:30-37`（`adjustStep`）与 `:39-46`（`getRealStep` 里 `options.minStep ?? 15`）；
 * 到最新的 `ee48e701` 这一段一字未改。
 *
 * 一个要先说清的事实（见 `第六步-流水线/n34/拿不准-step.md` U-step-1）：羚牛这版的 240 点
 * 算法 `max(floor(range/240), 1)` 算出来的点数**最多就 240 个**，所以「不填步长 + 拉长
 * 时间范围」这条路其实撞不到 11000 上限；真正会被 prometheus 拒的是**面板上自填了一个
 * 很小的步长**（例：填 60 秒却看 30 天 = 43200 个点）。下面用例 3 就是这一条，也是这次
 * 真正修掉的那条；用例 1、2、4 证的是「该不变的没被改坏」。
 */
// rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/。
// （`@/components/TimeRangePicker` 的 index 会连带 import 日期选择器组件；这条和
//   `src/__tests__/step6d/l4/dsqueries.submit.test.ts:23` 用的是同一个办法。）
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// 先初始化 i18next 再 import 下面的东西：`prometheus.ts` -> `@/components/TimeRangePicker` ->
// `components/TimeRangePicker/locale/index.ts` 一进来就调 `i18next.addResourceBundle`，
// 没先跑过 `@/i18n` 的话拿到的默认导出还不是 i18next 实例
// （`src/__tests__/step6d/README.md` 第三节第 5 条；写法同 `../l4/ck.alertRule.submit.test.ts:26`）。
import '@/i18n';

import moment from 'moment';

import { adjustStep } from '@/pages/dashboard/Renderer/datasource/prometheus';
import prometheusQuery from '@/pages/dashboard/Renderer/datasource/prometheus';

// 取数链路只 mock 这两个请求函数，夹取的算术照常跑真代码。
jest.mock('@/services/dashboardV2', () => ({
  fetchHistoryRangeBatch: jest.fn(() => Promise.resolve({ dat: [] })),
  fetchHistoryInstantBatch: jest.fn(() => Promise.resolve({ dat: [] })),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { fetchHistoryRangeBatch } = require('@/services/dashboardV2');

const HOUR = 3600;
const DAY = 86400;
/** 固定一个绝对时刻做基准，免得用例结果随「现在」飘。parse() 对 moment 原样返回。 */
const BASE = 1700000000;
const rangeOf = (seconds: number) => ({
  start: moment.unix(BASE),
  end: moment.unix(BASE + seconds),
});

/** 跑一次取数，把实际发出去的第一条 range query 掏出来。 */
async function queryOnce(time: any, target: any) {
  (fetchHistoryRangeBatch as jest.Mock).mockClear();
  await prometheusQuery({
    dashboardId: 'board-1',
    datasourceCate: 'prometheus',
    datasourceValue: 1,
    time,
    targets: [{ refId: 'A', expr: 'up', ...target }],
  } as any);
  expect(fetchHistoryRangeBatch as jest.Mock).toHaveBeenCalledTimes(1);
  return (fetchHistoryRangeBatch as jest.Mock).mock.calls[0][0].queries[0];
}

describe('adjustStep（纯函数，照 fe 基线）', () => {
  it('范围 1 小时、步长没填：下限 15 秒兜底，safeStep 不满 1 秒输掉', () => {
    // safeStep = 3600 / 11000 = 0.327…，比 1 小所以不取整，max(15, 15, 0.327) = 15
    expect(adjustStep(15, 15, HOUR)).toBe(15);
    // 就算算出来的步长是 1 秒，下限也会把它顶到 15
    expect(adjustStep(1, 15, HOUR)).toBe(15);
  });

  it('范围 30 天、步长很小：11000 点上限这一项胜出，等于 ceil(2592000/11000) = 236', () => {
    expect(Math.ceil((30 * DAY) / 11000)).toBe(236);
    expect(adjustStep(1, 15, 30 * DAY)).toBe(236);
    expect(adjustStep(15, 15, 30 * DAY)).toBe(236);
  });

  it('填了 60：短范围就按 60，长范围要被顶到 ≥ 范围/11000', () => {
    expect(adjustStep(60, 60, HOUR)).toBe(60);
    const step = adjustStep(60, 60, 30 * DAY);
    expect(step).toBe(236);
    expect(step).toBeGreaterThanOrEqual((30 * DAY) / 11000);
  });

  it('夹完之后点数一定不超过 11000', () => {
    [HOUR, DAY, 7 * DAY, 30 * DAY, 365 * DAY].forEach((range) => {
      const step = adjustStep(Math.max(Math.floor(range / 240), 1), 15, range);
      expect(range / step).toBeLessThanOrEqual(11000);
      const stepWithTiny = adjustStep(1, 1, range);
      expect(range / stepWithTiny).toBeLessThanOrEqual(11000);
    });
  });
});

describe('prometheusQuery 发出去的 step（三处 _step 来源都夹过）', () => {
  it('来源一 · 面板默认 240 点算法：1 小时不填步长 → 15', async () => {
    const q = await queryOnce(rangeOf(HOUR), {});
    expect(q.step).toBe(15);
  });

  it('来源一 · 面板默认 240 点算法：30 天不填步长 → 10800（240 点算法本来就不超上限，夹取不动它）', async () => {
    const q = await queryOnce(rangeOf(30 * DAY), {});
    expect(q.step).toBe(10800);
    expect((30 * DAY) / q.step).toBeLessThanOrEqual(11000);
  });

  it('来源三 · 面板自填步长：30 天填 60 → 被顶到 236（改之前会发 60、被 prometheus 拒）', async () => {
    const q = await queryOnce(rangeOf(30 * DAY), { step: 60 });
    expect(q.step).toBe(236);
    expect(q.step).toBeGreaterThanOrEqual((30 * DAY) / 11000);
  });

  it('来源三 · 面板自填步长：1 小时填 60 → 还是 60（短范围不被夹大）', async () => {
    const q = await queryOnce(rangeOf(HOUR), { step: 60 });
    expect(q.step).toBe(60);
  });

  it('来源二 · target.time 重算：面板 1 小时、查询自己挂 30 天 → 按 30 天算并夹取', async () => {
    // 不填步长：target.time 那一支把 _step 重算成 floor(2592000/240) = 10800
    const q1 = await queryOnce(rangeOf(HOUR), { time: rangeOf(30 * DAY) });
    expect(q1.step).toBe(10800);
    // 填 60：先被 target.step 盖成 60，再被 30 天的 11000 上限顶到 236
    const q2 = await queryOnce(rangeOf(HOUR), { time: rangeOf(30 * DAY), step: 60 });
    expect(q2.step).toBe(236);
  });

  it('start / end 的对齐取整用的是夹后的步长', async () => {
    const q = await queryOnce(rangeOf(30 * DAY), { step: 60 });
    expect(q.step).toBe(236);
    expect(q.start % q.step).toBe(0);
    expect(q.end % q.step).toBe(0);
  });
});
