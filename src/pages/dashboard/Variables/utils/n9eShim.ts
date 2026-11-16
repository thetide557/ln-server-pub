/*
 * step6d(L3) shim —— 不是 fe v9.1.0 的文件，是羚牛这边补的最小垫片。
 *
 * fe 的 `Variables/utils/replaceTemplateVariables.ts` 要两个 pub 没有的导出：
 *   1. `getDefaultStepByTime`（fe `src/pages/dashboard/utils/index.ts:46-58`）——pub 的
 *      `src/pages/dashboard/utils.ts` 只有 `getStepByTimeAndStep`，没有这个。这里原样照抄 fe 的实现。
 *   2. `getGlobalState`（fe `src/pages/dashboard/globalState.ts:18`）——pub 的 globalState 是 v6 的形状，
 *      既没有 `getGlobalState` 这个导出，也没有 `variablesWithOptions` / `range` 这两个键；
 *      pub 的仪表盘变量走的是另一套 `VariableConfig`。
 *
 * ---- 2026-10-07 N34-var：把第 2 条从空实现改成真的桥 ----
 * 原来这里 `getGlobalState('variablesWithOptions')` 恒回 `[]`，后果是仪表盘面板 SQL 里写的看板自定义
 * 变量（`${var}` / `$var` / `[[var]]`）不会被替换成当前选中的值，原文直接发给数据库；只有内置的
 * `$__from` / `$__to` 这类有效（调用方会把 range 直接传进来）。
 *
 * 现在的做法，按 fe v9.1.0 的形状做最小桥：
 *   - 用 pub 已经在用的 `react-hooks-global-state`（和 `src/pages/dashboard/globalState.ts` 同一个库），
 *     在本文件里**另起**一份只有两个键的小存储，不去动 pub `globalState.ts` 的类型参数
 *     （当初写这个垫片就是为了避开改它）。fe 把这两个键放在 globalState.ts 里
 *     （`git -C fe show v9.1.0:src/pages/dashboard/globalState.ts`），我们放在垫片里，键名与默认值照抄。
 *   - 谁来写：`src/pages/dashboard/Renderer/datasource/useQuery.tsx` 在发每一次面板取数之前写一次
 *     （那是所有仪表盘面板取数的唯一入口，一处就盖住仪表盘详情页 / Board / sxxc 两份 / 面板编辑器预览 /
 *     分享图表页），`src/pages/dashboard/Detail/Detail.tsx` 在变量值变化、时间范围变化、切换仪表盘时也写
 *     （照 fe v9.1.0 `Detail/Detail.tsx:97-98,266-282` 的语义）。
 *   - 老套 `VariableConfig` 的变量对象形状和新套 `Variables/types.ts` 的 `IVariable` 不完全一样：
 *     老套 `options` 是 `string[]`（见 `VariableConfig/definition.ts:27`），新套要 `{ label, value }[]`
 *     （`Variables/types.ts:11-14`，`utils/ajustData.ts:137,145` 读的是 `option.value`）。
 *     下面 `toVariablesWithOptions` 负责在桥上转一下，老套本身一行不改。
 */
import moment from 'moment';
import _ from 'lodash';
import { createGlobalState } from 'react-hooks-global-state';

import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';

import { IVariable } from '../types';

// 照抄 fe v9.1.0 src/pages/dashboard/utils/index.ts:46-58
export function getDefaultStepByTime(
  time: IRawTimeRange,
  options: {
    panelWidth?: number;
    maxDataPoints?: number;
  },
) {
  let maxDataPoints = options.maxDataPoints ?? options.panelWidth ?? 240;
  const parsedRange = parseRange(time);
  let start = moment(parsedRange.start).unix();
  let end = moment(parsedRange.end).unix();
  return Math.max(Math.floor((end - start) / maxDataPoints), 1);
}

/*
 * 两个键与默认值照抄 fe v9.1.0 src/pages/dashboard/globalState.ts：
 *   variablesWithOptions: []
 *   range: { start: 'now-1h', end: 'now' }
 * 这份存储只在本垫片里用，和 pub 自己的 `src/pages/dashboard/globalState.ts` 互不相干。
 */
const store = createGlobalState<{
  variablesWithOptions: IVariable[];
  range: IRawTimeRange;
}>({
  variablesWithOptions: [],
  range: {
    start: 'now-1h',
    end: 'now',
  },
});

export const getGlobalState = store.getGlobalState;
export const setGlobalState = store.setGlobalState;

/**
 * 老套 VariableConfig 的变量对象 → 新套 Variables/types.ts 的 IVariable。
 * 只动 `options` 一个字段：老套是 `string[]`（query / custom 类型）或数据源对象数组（datasource 类型），
 * 新套要 `{ label, value }[]`。其余字段（name / value / type / reg / multi / allValue / datasource 等）
 * 两边同名同义，原样带过去。
 */
export function toVariablesWithOptions(variables?: any[]): IVariable[] {
  return _.map(variables ?? [], (item) => {
    return {
      ...item,
      options: _.map(item?.options ?? [], (option: any) => {
        if (_.isObject(option)) {
          // datasource 类型变量的 options 是数据源对象 { id, name, ... }
          const value = option['value'] ?? option['id'];
          const label = option['label'] ?? option['name'] ?? value;
          return { label: _.toString(label), value };
        }
        return { label: _.toString(option), value: option };
      }),
    };
  }) as IVariable[];
}
