/**
 * 第六步 第 4 段 · 阶段 2（W2）· `datasource_queries` 的提交体与回填。
 *
 * 术语一句话：`datasource_queries` 是夜莺 v9 用来说「这条规则挑哪些数据源」的字段，
 * 形状 `[{ match_type, op, values }]`（match_type 0 = 按 id、1 = 按名字通配、2 = 全部）；
 * 老字段 `datasource_ids` 是一串 id，`[0]` 表示「全部」。
 *
 * 要证四件事（判据：顾问答案/大顾问-Q3.md 第一、三、四、六节 + 顾问问答.md Q3 拍板-14）：
 *  1. **新 8 种**（mysql / pgsql / doris / opensearch / loki / victorialogs / tdengine / iotdb）
 *     提交体里**顶层**有 `datasource_queries`、**没有** `datasource_ids`，`rule_config` 里也没有这个字段。
 *  2. **老类型**（prometheus / elasticsearch / ck）提交体**逐字节不变**，只多出 `datasource_queries` 一个字段；
 *     它的值按换算规则：ids 含 0 → `[{match_type:2,op:'in',values:[0]}]`；不含 0 → `[{match_type:0,op:'in',values:ids}]`。
 *     比对底本是本分支起点 68a09e9c 的 utils.ts 副本（见 legacy/utils.68a09e9c.ts 文件头）。
 *  3. 边界：老类型一个数据源都没选（ids 为空）时**不发** `datasource_queries`（发空条件后端会当成谁都不匹配）；
 *     新 8 种 `datasource_queries` 为空时发 fe 的默认值 `[{match_type:0,op:'in',values:[]}]`。
 *  4. 回填（`processInitialValues`）：老类型把 `datasource_queries` 删掉、新 8 种把 `datasource_ids` 删掉。
 *
 * 调用顺序照 pub 提交按钮里的真实写法（同 l4/ck.alertRule.submit.test.ts 的说明）：
 *   src/pages/alertRules/Form/index.tsx:427  transformStrategyData(values)   // strategies 摊平成一条条规则
 *   :472 / :494                              processFormValues(values)        // 每条规则各自再过一道
 */
// rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules，指回等价的 CommonJS 版 lib/。
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// 先初始化 i18next 再 import 下面的东西（理由同 l4/ck.alertRule.submit.test.ts:23-25）。
import '@/i18n';

import _ from 'lodash';
import moment from 'moment';
import {
  transformStrategyData,
  processFormValues,
  processInitialValues,
  isLegacyCate,
  datasourceIdsToQueries,
  resolveDatasourceIdsByQueries,
  getDatasourceValueByQueries,
  getDefaultValuesByCate,
  NEW_DATASOURCE_QUERY_CATES,
} from '@/pages/alertRules/Form/utils';
// 「我动手之前」的老逻辑，用来算老类型提交体的期望值
import { processFormValues as processFormValuesBefore } from './legacy/utils.68a09e9c';

const NEW_CATES = ['mysql', 'pgsql', 'doris', 'opensearch', 'loki', 'victorialogs', 'tdengine', 'iotdb'];

// 一条策略的骨架。写成工厂函数：processFormValues 会就地改传进去的对象，每条用例都要一份全新的；
// 而且 effective_time 里是 moment 对象，不能用 JSON 深拷贝。
const makeStrategy = (over: any = {}) => ({
  prod: 'metric',
  cate: 'prometheus',
  enable_status: true,
  notify_recovered: true,
  prom_eval_interval: 30,
  prom_for_duration: 60,
  severity: 2,
  effective_time: [
    {
      enable_days_of_week: ['0', '1', '2', '3', '4', '5', '6'],
      enable_stime: moment('00:00', 'HH:mm'),
      enable_etime: moment('00:00', 'HH:mm'),
    },
  ],
  callbacks: [],
  annotations: [],
  rule_config: {
    queries: [{ ref: 'A', interval: 1, interval_unit: 'min' }],
    triggers: [
      {
        mode: 0,
        expressions: [{ ref: 'A', comparisonOperator: '>', value: 0, logicalOperator: '&&' }],
        severity: 2,
      },
    ],
  },
  ...over,
});

function makeFormValues(strategies: any[]) {
  return {
    name: '一条告警规则',
    strategy_id: undefined,
    asset_id: undefined,
    excludes: undefined,
    append_tags: [],
    note: '',
    strategies,
  };
}

// 走一遍真实的提交链路：先摊平，再逐条 processFormValues
function submit(strategy: any, fn: any = processFormValues) {
  const rules = transformStrategyData(makeFormValues([strategy]));
  return fn(rules[0]) as any;
}

describe('阶段 2 · isLegacyCate / 换算函数', () => {
  it('新 8 种不是老类型；老类型（含没见过的 cate、undefined）都算老的', () => {
    expect(NEW_DATASOURCE_QUERY_CATES).toEqual(NEW_CATES);
    _.forEach(NEW_CATES, (cate) => expect(isLegacyCate(cate)).toBe(false));
    _.forEach(['prometheus', 'elasticsearch', 'ck', 'influxdb', 'aliyun-sls', 'host', undefined], (cate) =>
      expect(isLegacyCate(cate as any)).toBe(true),
    );
  });

  it('datasourceIdsToQueries：含 0 → 全部；不含 0 → 按 id；空 → 不发', () => {
    expect(datasourceIdsToQueries([0])).toEqual([{ match_type: 2, op: 'in', values: [0] }]);
    // 老选择器保证含 0 时只剩 [0]，这里再兜一手混着的情况
    expect(datasourceIdsToQueries([3, 0])).toEqual([{ match_type: 2, op: 'in', values: [0] }]);
    expect(datasourceIdsToQueries([2, 3])).toEqual([{ match_type: 0, op: 'in', values: [2, 3] }]);
    expect(datasourceIdsToQueries(7)).toEqual([{ match_type: 0, op: 'in', values: [7] }]);
    expect(datasourceIdsToQueries([])).toBeUndefined();
    expect(datasourceIdsToQueries(undefined)).toBeUndefined();
  });

  it('resolveDatasourceIdsByQueries：照后端 models/alert_rule.go:1625-1746 的算法', () => {
    const list = [
      { id: 1, name: 'ck-prod-a' },
      { id: 2, name: 'ck-prod-b' },
      { id: 3, name: 'ck-test' },
    ];
    // 全部
    expect(resolveDatasourceIdsByQueries([{ match_type: 2, op: 'in', values: [] }], list)).toEqual([1, 2, 3]);
    // 按 id 精确
    expect(resolveDatasourceIdsByQueries([{ match_type: 0, op: 'in', values: [2] }], list)).toEqual([2]);
    // values 就是 [0] 时当「全部」
    expect(resolveDatasourceIdsByQueries([{ match_type: 0, op: 'in', values: [0] }], list)).toEqual([1, 2, 3]);
    // 不包含
    expect(resolveDatasourceIdsByQueries([{ match_type: 0, op: 'not in', values: [1] }], list)).toEqual([2, 3]);
    // 按名字通配：* 任意串
    expect(resolveDatasourceIdsByQueries([{ match_type: 1, op: 'in', values: ['ck-prod-*'] }], list)).toEqual([1, 2]);
    // 按名字通配 + 不包含
    expect(resolveDatasourceIdsByQueries([{ match_type: 1, op: 'not in', values: ['ck-prod-*'] }], list)).toEqual([3]);
    // 多条取交集：先「全部」再「不含 3」
    expect(
      resolveDatasourceIdsByQueries(
        [
          { match_type: 2, op: 'in', values: [] },
          { match_type: 0, op: 'not in', values: [3] },
        ],
        list,
      ),
    ).toEqual([1, 2]);
    // 已经被删掉的数据源 id 自然掉出来
    expect(resolveDatasourceIdsByQueries([{ match_type: 0, op: 'in', values: [9] }], list)).toEqual([]);
    // 条件为空 / 没有数据源
    expect(resolveDatasourceIdsByQueries([], list)).toEqual([]);
    expect(resolveDatasourceIdsByQueries([{ match_type: 0, op: 'in', values: [1] }], [])).toEqual([]);
    // 编辑器要的那个「单个 id」= 命中列表的第一个
    expect(getDatasourceValueByQueries([{ match_type: 0, op: 'in', values: [2, 3] }], list)).toBe(2);
    expect(getDatasourceValueByQueries(undefined, list)).toBeUndefined();
  });
});

describe('阶段 2 · 新 8 种的提交体：只发 datasource_queries', () => {
  _.forEach(NEW_CATES, (cate) => {
    it(`${cate}：顶层有 datasource_queries、没有 datasource_ids，rule_config 里没有这个字段`, () => {
      const data = submit(
        makeStrategy({
          cate,
          prod: _.includes(['loki', 'victorialogs'], cate) ? 'logging' : 'metric',
          datasource_queries: [{ match_type: 0, op: 'in', values: [3] }],
        }),
      );
      expect(data.cate).toBe(cate);
      expect(data.datasource_queries).toEqual([{ match_type: 0, op: 'in', values: [3] }]);
      expect(data.datasource_ids).toBeUndefined();
      expect('datasource_ids' in data).toBe(false);
      expect(data.rule_config.datasource_queries).toBeUndefined();
      // 形状：数组，每项三个键
      expect(Array.isArray(data.datasource_queries)).toBe(true);
      expect(_.keys(data.datasource_queries[0]).sort()).toEqual(['match_type', 'op', 'values']);
    });
  });

  it('新 8 种的 datasource_queries 为空时，发 fe 的默认值 [{match_type:0,op:"in",values:[]}]', () => {
    _.forEach([[], undefined], (empty) => {
      const data = submit(makeStrategy({ cate: 'mysql', datasource_queries: empty }));
      expect(data.datasource_queries).toEqual([{ match_type: 0, op: 'in', values: [] }]);
      expect(data.datasource_ids).toBeUndefined();
    });
  });

  it('新 8 种就算表单里还留着 datasource_ids（比如从 prometheus 切过来的残留），提交时也会删掉', () => {
    const data = submit(
      makeStrategy({
        cate: 'tdengine',
        datasource_ids: [0],
        datasource_queries: [{ match_type: 2, op: 'in', values: [0] }],
      }),
    );
    expect(data.datasource_ids).toBeUndefined();
    expect(data.datasource_queries).toEqual([{ match_type: 2, op: 'in', values: [0] }]);
  });

  // 第六步 第4段 W3a（阶段 1 收尾）改：W2 写这条时新 8 种还没挂编辑器，默认值里只有三项、没有 rule_config
  //（当时 utils.ts 里就写着「rule_config 留给阶段 1」）。阶段 1 把十种编辑器都挂上了，默认值里多了 rule_config，
  // 所以期望的键从三项变四项；这条断言真正要守的是「不带老字段 datasource_ids、datasource_queries 是那份空条件」，
  // 这两点一字未改。
  it('切到新 8 种时给的默认值带 prod / cate / datasource_queries / rule_config，不带老字段 datasource_ids', () => {
    _.forEach(NEW_CATES, (cate) => {
      const def: any = getDefaultValuesByCate('metric', cate);
      expect(_.keys(def).sort()).toEqual(['cate', 'datasource_queries', 'prod', 'rule_config']);
      expect(def.datasource_ids).toBeUndefined();
      expect(def.datasource_queries).toEqual([{ match_type: 0, op: 'in', values: [] }]);
    });
  });
});

describe('阶段 2 · 老类型的提交体：逐字节不变，只多一个 datasource_queries', () => {
  const legacyCases: { cate: string; ids: number[]; expected: any }[] = [
    { cate: 'prometheus', ids: [0], expected: [{ match_type: 2, op: 'in', values: [0] }] },
    { cate: 'prometheus', ids: [2, 3], expected: [{ match_type: 0, op: 'in', values: [2, 3] }] },
    { cate: 'elasticsearch', ids: [4], expected: [{ match_type: 0, op: 'in', values: [4] }] },
    { cate: 'ck', ids: [5], expected: [{ match_type: 0, op: 'in', values: [5] }] },
  ];

  _.forEach(legacyCases, ({ cate, ids, expected }) => {
    it(`${cate}（datasource_ids=${JSON.stringify(ids)}）：去掉 datasource_queries 之后与老逻辑的结果完全相同`, () => {
      const now = submit(makeStrategy({ cate, datasource_ids: ids }));
      const before = submit(makeStrategy({ cate, datasource_ids: ids }), processFormValuesBefore);

      // 老逻辑本来就没有这个字段
      expect(before.datasource_queries).toBeUndefined();
      // 现在多出来的**唯一**字段就是 datasource_queries
      expect(_.difference(_.keys(now), _.keys(before))).toEqual(['datasource_queries']);
      expect(_.difference(_.keys(before), _.keys(now))).toEqual([]);
      // 其余字段逐个深比较
      expect(_.omit(now, 'datasource_queries')).toEqual(before);
      // 老字段照旧发
      expect(now.datasource_ids).toEqual(ids);
      // 追加的等价条件
      expect(now.datasource_queries).toEqual(expected);
    });
  });

  it('老类型一个数据源都没选（ids 为空）时不发 datasource_queries', () => {
    const now = submit(makeStrategy({ cate: 'ck', datasource_ids: [] }));
    const before = submit(makeStrategy({ cate: 'ck', datasource_ids: [] }), processFormValuesBefore);
    expect(now.datasource_ids).toEqual([]);
    expect('datasource_queries' in now).toBe(false);
    expect(now).toEqual(before);
  });

  it('host 规则一个字节都不加（后端 host 路线不看数据源）', () => {
    const now = submit(makeStrategy({ prod: 'host', cate: 'host', datasource_ids: undefined }));
    const before = submit(makeStrategy({ prod: 'host', cate: 'host', datasource_ids: undefined }), processFormValuesBefore);
    expect(now.cate).toBe('host');
    expect(now.datasource_ids).toEqual([]);
    expect('datasource_queries' in now).toBe(false);
    expect(now).toEqual(before);
  });

  it('anomaly（智能告警）按老类型走：cate 折成 prometheus，照样只多一个字段', () => {
    const now = submit(makeStrategy({ prod: 'anomaly', cate: 'prometheus', datasource_ids: [0] }));
    const before = submit(makeStrategy({ prod: 'anomaly', cate: 'prometheus', datasource_ids: [0] }), processFormValuesBefore);
    expect(now.cate).toBe('prometheus');
    expect(_.omit(now, 'datasource_queries')).toEqual(before);
    expect(now.datasource_queries).toEqual([{ match_type: 2, op: 'in', values: [0] }]);
  });
});

describe('阶段 2 · 编辑回填（processInitialValues）', () => {
  // 后端 GET /api/n9e/alert-rule/strategy/:id 把两个字段原样返回、不翻译
  const fromBackend = (over: any) => ({
    prod: 'metric',
    cate: 'prometheus',
    disabled: 0,
    notify_recovered: 1,
    enable_in_bg: 0,
    callbacks: [],
    annotations: {},
    enable_stimes: ['00:00'],
    enable_etimes: ['00:00'],
    enable_days_of_weeks: [['0', '1']],
    rule_config: { queries: [], triggers: [] },
    ...over,
  });

  it('老类型：表单值里只留 datasource_ids，datasource_queries 删掉', () => {
    const values: any = processInitialValues(
      fromBackend({
        cate: 'ck',
        datasource_ids: [5],
        datasource_queries: [{ match_type: 0, op: 'in', values: [5] }],
      }),
    );
    expect(values.datasource_ids).toEqual([5]);
    expect('datasource_queries' in values).toBe(false);
  });

  it('新 8 种：表单值里只留 datasource_queries，datasource_ids 删掉', () => {
    const values: any = processInitialValues(
      fromBackend({
        cate: 'mysql',
        datasource_ids: null,
        datasource_queries: [{ match_type: 1, op: 'in', values: ['mysql-*'] }],
      }),
    );
    expect(values.datasource_queries).toEqual([{ match_type: 1, op: 'in', values: ['mysql-*'] }]);
    expect('datasource_ids' in values).toBe(false);
  });

  it('新 8 种：库里两个字段都空时，给一份 fe 的默认筛选条件', () => {
    const values: any = processInitialValues(fromBackend({ cate: 'loki', prod: 'logging', datasource_ids: null, datasource_queries: null }));
    expect(values.datasource_queries).toEqual([{ match_type: 0, op: 'in', values: [] }]);
    expect('datasource_ids' in values).toBe(false);
  });

  it('host：按老类型走，datasource_queries 删掉', () => {
    const values: any = processInitialValues(fromBackend({ prod: 'host', cate: 'host', datasource_ids: [], datasource_queries: [] }));
    expect('datasource_queries' in values).toBe(false);
  });

  it('回填 → 提交走一圈：新 8 种仍然只发 datasource_queries', () => {
    const values: any = processInitialValues(
      fromBackend({
        cate: 'doris',
        datasource_ids: [1],
        datasource_queries: [{ match_type: 0, op: 'in', values: [1] }],
      }),
    );
    const data = submit({ ...makeStrategy({ cate: 'doris' }), ...values });
    expect(data.datasource_queries).toEqual([{ match_type: 0, op: 'in', values: [1] }]);
    expect(data.datasource_ids).toBeUndefined();
  });
});
