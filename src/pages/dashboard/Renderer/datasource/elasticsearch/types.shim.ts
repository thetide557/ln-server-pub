/**
 * 第六步 ES 升级轮（step6f）的目录内垫片，不是 fe v9.1.0 的文件。
 *
 * 为什么要它：fe v9.1.0 的取数文件（本目录 `query.ts`）读了 ITarget 上的三样东西，
 * 而羚牛 pub 的 `src/pages/dashboard/types.ts:27-42` 那个 ITarget 里没有：
 *   - `__mode__`（`'__expr__' | '__query__'`，v9 用来区分「表达式」和「查询」两种 target，fe types.ts:29）
 *   - `hide`（这条查询隐不隐藏，fe types.ts:45）
 *   - `query.index_type`（`'index' | 'index_pattern'`，索引 / 索引模式两种取数方式，fe types.ts:37）
 * 按本轮纪律「pub 现有文件零改动」，不去改 `src/pages/dashboard/types.ts`；
 * 改成 `query.ts` 里那一行 `import { ITarget } from '../../../types'` 指到这里，
 * 在 pub 那个类型上只加不改地补出这三样（都是可选的，pub 现有代码不受影响）。
 * 依据：L 的拍板-32 第 2 条同一条改动纪律①（改 import 路径，不改 pub 文件）。
 */
import { ITarget as IPubTarget } from '../../../types';

export interface ITarget extends Omit<IPubTarget, 'query'> {
  __mode__?: '__expr__' | '__query__';
  hide?: boolean;
  // 故意写成 any：`query.ts` 里用 `_.get(targets, '[0].query.date_field')` 这类字符串路径取值，
  // 本仓库的 @types/lodash 会顺着类型把路径解析到底，query 若是具体形状就会推出 undefined 而报错。
  query?: any;
}
