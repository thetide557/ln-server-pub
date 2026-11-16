/**
 * 第六步 ES 升级轮（step6f）的目录内垫片，不是 fe v9.1.0 的文件。
 *
 * 为什么要它：fe v9.1.0 的 `elasticsearch/index.ts:7`（本目录里改名成 `query.ts`）
 * `import { fetchHistoryRangeBatch2 } from '@/services/dashboardV2'`，
 * 而羚牛 pub 的 `src/services/dashboardV2.ts` 里只有不带 2 的 `fetchHistoryRangeBatch`（`:160`）。
 * 两者的签名一样都是 `(data, signalKey)`，区别只在打的接口：
 *   pub  `fetchHistoryRangeBatch`  → POST /api/takin/query-range-batch
 *   fe   `fetchHistoryRangeBatch2` → POST /api/takin-plus/query-batch（企业版接口）
 * fe 那个函数只在 `IS_PLUS` 为真的分支里用（`query.ts:144` 之后的 else 分支、`:186`），
 * 羚牛开源构建下 `IS_PLUS` 恒为 false（`src/utils/constant.ts:22`），那段是死代码，
 * 但 TypeScript 解析不到这个导出就会报错。
 *
 * 按本轮纪律「pub 现有文件零改动」，不去改 `src/services/dashboardV2.ts`，
 * 改成 `query.ts` 里那一行 import 指到这里，由这里转调 pub 已有的那个函数。
 * 依据：顾问意见 X-8 第 3 条「补核 ①」、L 的拍板-32 第 2 条。
 */
import { fetchHistoryRangeBatch } from '@/services/dashboardV2';

export const fetchHistoryRangeBatch2 = (data: any, signalKey: string) => {
  return fetchHistoryRangeBatch(data, signalKey);
};
