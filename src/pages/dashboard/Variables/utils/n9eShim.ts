/*
 * step6d(L3) shim —— 不是 fe v9.1.0 的文件，是羚牛这边补的最小垫片。
 *
 * fe 的 `Variables/utils/replaceTemplateVariables.ts` 要两个 pub 没有的导出：
 *   1. `getDefaultStepByTime`（fe `src/pages/dashboard/utils/index.ts:46-58`）——pub 的
 *      `src/pages/dashboard/utils.ts` 只有 `getStepByTimeAndStep`，没有这个。这里原样照抄 fe 的实现。
 *   2. `getGlobalState`（fe `src/pages/dashboard/globalState.ts:18`）——pub 的 globalState 是 v6 的形状，
 *      既没有 `getGlobalState` 这个导出，也没有 `variablesWithOptions` / `range` 这两个键；
 *      pub 的仪表盘变量走的是另一套 `VariableConfig`。改 pub 的 globalState 要动它的类型参数（不是纯追加），
 *      所以这里给一个空实现：用户自定义的仪表盘变量在 ck 图表 SQL 里不会被替换（内置的 $__from / $__to
 *      仍然有效，因为调用方 `clickHouse/Dashboard/datasource.tsx:45` 会把 range 直接传进来）。
 *      这是本轮登记的功能缺角，见 `第六步-流水线/多数据源/进度-L3.md` 末尾。
 */
import moment from 'moment';

import { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';

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

export function getGlobalState(key: 'variablesWithOptions'): any[];
export function getGlobalState(key: 'range'): IRawTimeRange | undefined;
export function getGlobalState(key: string): any {
  if (key === 'variablesWithOptions') return [];
  return undefined;
}
