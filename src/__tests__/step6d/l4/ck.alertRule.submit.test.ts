/**
 * 第六步 第 4 段 · 阶段 0（ck 试点）· 提交体断言。
 *
 * 要证三件事：
 *  1. 羚牛的多策略表单值经过提交前的两道转换之后，**rule_config 不再套在 strategies 下面**，
 *     而是每条策略摊平成一条独立规则（后端收到的就是这个形状）。
 *  2. ck 的查询内容原样带出去：SQL 一字不改、查询别名 ref 不被按下标重写成 A/B/C。
 *     （后一条是 lead 拍板-10 修掉的老毛病：老分支里有 `ref: alphabet[index]`，
 *     用户在 QueryName 里改过的别名会被覆盖，而触发条件是按 $别名 引用的，改完就对不上。）
 *  3. 新建一条 ck 规则（查询里没有 range 字段）能顺利走完 processFormValues 不抛异常。
 *     这是拍板-10 修的另一半：老分支无条件调 mapOptionToRelativeTimeRange(query.range)，
 *     而那个函数第一行就读 option.start，range 为 undefined 时直接 TypeError。
 *
 * 转换函数的调用顺序照 pub 提交按钮里的真实写法：
 *   src/pages/alertRules/Form/index.tsx:412-414  form.validateFields()
 *   :427                                          transformStrategyData(values)   // 把 strategies 摊平成规则数组
 *   :472 / :494                                   processFormValues(values)        // 每条规则各自再过一道
 */
// rc-picker 的 es/ 目录是 ESM，jest 默认不转译 node_modules（jest.config.ts 的 transformIgnorePatterns），
// 指回等价的 CommonJS 版 lib/。@/components/TimeRangePicker 会用到。写法同 ../l3/queryBuilders.render.test.tsx。
jest.mock('rc-picker/es/generate/moment', () => require('rc-picker/lib/generate/moment'));

// 先初始化 i18next 再 import 下面的东西：Form/utils.ts -> @/components/TimeRangePicker ->
// components/TimeRangePicker/locale/index.ts 一进来就调 i18next.addResourceBundle，
// 没先跑过 @/i18n 的话拿到的默认导出还不是 i18next 实例（../README.md 第三节第 5 条）。
import '@/i18n';

import moment from 'moment';
import { transformStrategyData, processFormValues, V9_EDITOR_CATES } from '@/pages/alertRules/Form/utils';

// 一条 ck 策略：查询别名故意用 'X' 而不是 'A'，用来验它不会被按下标重写成 'A'。
// 写成工厂函数而不是常量，是因为 processFormValues 会就地改传进去的对象（_.map 里直接改 item.keys），
// 每条用例都要一份全新的；而且 effective_time 里是 moment 对象，不能用 JSON 深拷贝（会变成字符串）。
const makeCkStrategy = () => ({
  prod: 'metric',
  cate: 'ck',
  datasource_ids: [1],
  enable_status: true,
  notify_recovered: true,
  prom_eval_interval: 30,
  prom_for_duration: 60,
  effective_time: [
    {
      enable_days_of_week: ['0', '1', '2', '3', '4', '5', '6'],
      enable_stime: moment('00:00', 'HH:mm'),
      enable_etime: moment('00:00', 'HH:mm'),
    },
  ],
  rule_config: {
    queries: [
      {
        ref: 'X',
        sql: 'SELECT count(*) AS c FROM db.t',
        keys: {
          labelKey: ['host', 'idc'],
          valueKey: ['c'],
        },
      },
    ],
    triggers: [
      {
        mode: 0,
        expressions: [
          {
            ref: 'X',
            comparisonOperator: '>',
            value: 0,
            logicalOperator: '&&',
          },
        ],
        severity: 2,
        recover_config: { judge_type: 0 },
      },
    ],
    exp_trigger_disable: false,
    nodata_trigger: { enable: false, severity: 2 },
  },
});

// 表单整体的值：外面是规则级的公共字段，里面是 strategies 数组（羚牛的多策略结构）
function makeFormValues(strategies: any[]) {
  return {
    name: '一条 ck 告警规则',
    strategy_id: undefined,
    asset_id: undefined,
    excludes: undefined,
    append_tags: [],
    note: '',
    strategies,
  };
}

describe('阶段 0 · ck 告警规则的提交体', () => {
  it('V9_EDITOR_CATES 里有 ck（拍板-10 的开关）', () => {
    expect(V9_EDITOR_CATES).toContain('ck');
  });

  it('transformStrategyData 把 strategies 摊平成一条条独立规则，rule_config 不再套在 strategies 下', () => {
    const rules = transformStrategyData(makeFormValues([makeCkStrategy()]));
    expect(Array.isArray(rules)).toBe(true);
    expect(rules).toHaveLength(1);
    const rule: any = rules[0];
    // 规则级的公共字段被合并进来了
    expect(rule.name).toBe('一条 ck 告警规则');
    // 策略自己的字段也在
    expect(rule.cate).toBe('ck');
    expect(rule.rule_config).toBeDefined();
    // 关键：结果里不该再有 strategies 这一层
    expect(rule.strategies).toBeUndefined();
  });

  it('processFormValues 之后：cate 是 ck、SQL 原样、ref 没被重写、triggers 还在', () => {
    const rules = transformStrategyData(makeFormValues([makeCkStrategy()]));
    const data: any = processFormValues(rules[0]);

    expect(data.cate).toBe('ck');
    expect(data.strategies).toBeUndefined();

    // SQL 一字不改
    expect(data.rule_config.queries[0].sql).toBe('SELECT count(*) AS c FROM db.t');
    // 查询别名保持用户填的 'X'（老分支会把它按下标改成 'A'）
    expect(data.rule_config.queries[0].ref).toBe('X');
    // keys 下的数组按 fe 的写法拼成空格分隔的字符串
    expect(data.rule_config.queries[0].keys.labelKey).toBe('host idc');
    expect(data.rule_config.queries[0].keys.valueKey).toBe('c');

    // 触发条件在，并且 mode=0 时按表达式拼出了 exp（供后端求值）
    expect(data.rule_config.triggers).toHaveLength(1);
    expect(data.rule_config.triggers[0].exp).toBe('$X > 0');
    expect(data.rule_config.exp_trigger_disable).toBe(false);
  });

  it('prod 是字符串 metric，不是数字（拍板-13）', () => {
    const rules = transformStrategyData(makeFormValues([makeCkStrategy()]));
    const data: any = processFormValues(rules[0]);
    expect(typeof data.prod).toBe('string');
    expect(data.prod).toBe('metric');
  });

  it('新建的 ck 规则（查询里没有 range 字段）走 processFormValues 不抛（拍板-10 修的崩溃）', () => {
    const bare = makeCkStrategy();
    // 新建时 fe 的 ck 编辑器给出来的就是这样：只有 ref，没有 range
    bare.rule_config.queries = [{ ref: 'A' }];
    const rules = transformStrategyData(makeFormValues([bare]));
    let data: any;
    expect(() => {
      data = processFormValues(rules[0]);
    }).not.toThrow();
    expect(data.rule_config.queries[0].ref).toBe('A');
    // 没有 range 就不该凭空造出 from / to
    expect(data.rule_config.queries[0].from).toBeUndefined();
    expect(data.rule_config.queries[0].to).toBeUndefined();
  });

  it('两条 ck 策略会摊平成两条规则，各自带各自的 rule_config', () => {
    const a = makeCkStrategy();
    const b = makeCkStrategy();
    b.rule_config.queries[0].ref = 'Y';
    b.rule_config.queries[0].sql = 'SELECT 2';
    b.rule_config.triggers[0].expressions[0].ref = 'Y';

    const rules = transformStrategyData(makeFormValues([a, b]));
    expect(rules).toHaveLength(2);
    const d0: any = processFormValues(rules[0]);
    const d1: any = processFormValues(rules[1]);
    expect(d0.rule_config.queries[0].ref).toBe('X');
    expect(d1.rule_config.queries[0].ref).toBe('Y');
    expect(d1.rule_config.queries[0].sql).toBe('SELECT 2');
    expect(d1.rule_config.triggers[0].exp).toBe('$Y > 0');
  });
});
