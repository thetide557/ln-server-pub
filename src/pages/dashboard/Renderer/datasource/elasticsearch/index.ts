/**
 * 第六步 ES 升级轮（step6f）的目录内 shim，不是 fe v9.1.0 的文件。
 * fe 那个入口文件原样放在同目录的 `query.ts`（除第 7 行 import 外与 fe 逐字相同）。
 *
 * 这一层做两件事，依据：顾问意见 X-8 第 2 条与第 3 条「补核 ②」、L 的拍板-32。
 *
 * 一、返回值形状对齐（X-8 第 2 条）
 *   fe v9.1.0 的取数函数返回 `{ series, query }`，而羚牛 pub 的调用方
 *   `src/pages/dashboard/Renderer/datasource/useQuery.tsx:82-83` 期望的是一个数组
 *   （`.then((res: any[]) => setSeries(res))`）。`useQuery.tsx` 不在本轮允许改的四层目录里，
 *   所以在这里把 `series` 取出来。丢掉的 `query` 是给「查询详情」面板看的原始请求 / 响应，
 *   pub 的 useQuery 里根本没有这个状态（`:56-58` 只有 series / error / loading），丢了无人消费。
 *
 * 二、仪表盘变量替换的补位（X-8 第 3 条「补核 ②」）
 *   pub 旧版取数是自己替变量的：`datasourceValue` 和每个 target 的 `query.filter` 都过一遍
 *   `replaceExpressionVars(…, variableConfig, …)`（pub 旧 index.ts:48-54）。
 *   fe v9.1.0 改成靠 v9 的全局变量状态，取数里只留 `replaceTemplateVariables(query.filter, { range })`。
 *   但羚牛这边那条路是断的：`src/pages/dashboard/Variables/utils/n9eShim.ts:36` 的
 *   `getGlobalState('variablesWithOptions')` 直接返回 `[]`（step6d L3 登记过的缺角），
 *   也就是说用户自定义的仪表盘变量在 fe 那条路上替不掉，只有内置的 $__from / $__to 能替。
 *   pub 的 `Renderer/index.tsx` 又是把原始 targets + variableConfig 交给 useQuery 的，
 *   所以这里照 pub 旧版的写法先替一遍，再交给 fe 的取数函数——不改 `query.ts` 一个字。
 */
import _ from 'lodash';

import { replaceExpressionVars } from '../../../VariableConfig/constant';

import query from './query';

export default function elasticSearchQuery(options: any) {
  const { dashboardId, variableConfig } = options || {};
  let normalized = options;

  if (variableConfig) {
    const n = variableConfig.length;
    normalized = {
      ...options,
      datasourceValue: replaceExpressionVars(options.datasourceValue as any, variableConfig, n, dashboardId) as any,
      targets: _.map(options.targets, (target) => {
        const q: any = target?.query;
        if (!q || q.filter === undefined) return target;
        return {
          ...target,
          query: {
            ...q,
            filter: replaceExpressionVars(q.filter, variableConfig, n, dashboardId),
          },
        };
      }),
    };
  }

  return query(normalized).then((r: any) => r?.series ?? []);
}
