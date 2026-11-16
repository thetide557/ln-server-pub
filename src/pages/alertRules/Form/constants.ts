import moment from 'moment';
import _ from 'lodash';

import { allCates } from '@/components/AdvancedWrap/utils'; // 第六步 第4段 W3a：给下面的 getDefaultRuleConfig 用（fe:constants.ts:5 同样引法）

export const defaultRuleConfig = {
  host: {
    queries: [
      {
        key: 'all_hosts',
        op: '==',
        values: [],
      },
    ],
    triggers: [
      {
        type: 'target_miss',
        severity: 2,
        duration: 30,
      },
    ],
  },
  metric: {
    queries: [
      {
        prom_ql: '',
        severity: 2,
      },
    ],
  },
  logging: {
    queries: [
      {
        interval_unit: 'min',
        interval: 1,
        date_field: '@timestamp',
        value: {
          func: 'count',
        },
      },
    ],
    triggers: [
      {
        mode: 0,
        expressions: [
          {
            ref: 'A',
            comparisonOperator: '>',
            value: 0,
            logicalOperator: '&&',
          },
        ],
        severity: 2,
      },
    ],
  },
  anomaly: {
    algorithm: 'holtwinters',
    severity: 2,
  },
};

export const defaultValues = {
  disabled: 0,
  effective_time: [
    {
      enable_days_of_week: ['0', '1', '2', '3', '4', '5', '6'],
      enable_stime: moment('00:00', 'HH:mm'),
      enable_etime: moment('00:00', 'HH:mm'), // 起止时间一致时，表示全天有效
    },
  ],
  notify_recovered: true,
  recover_duration: 0,
  notify_repeat_step: 60,
  notify_max_number: 0,
  rule_config: defaultRuleConfig.metric,
  datasource_ids: [],
  prom_eval_interval: 30,
  prom_for_duration: 60,
  prod: 'metric',
  cate: 'prometheus',
  enable_status: true,
};

export const ruleTypeOptions = [
  {
    label: 'Metric',
    value: 'metric',
    pro: false,
  },
  {
    label: 'Host',
    value: 'host',
    pro: false,
  },
];

export const selectTypeOptions = [
  {
    // ---- 第六步 第4段 W0（lead 拍板-13，依据 顾问答案/大顾问-Q2.md 第三、五节）----
    // 原文是 `value: 1`（数字），改成 `value: 'metric'`（字符串）。
    // 理由：这一项的值会经 ProdSelect 写进该策略的 prod 字段，prod 原样进提交体；
    // 后端的 Prod 是 string 类型、而且靠它分流，收到数字 1 会在 BindJSON 那一层直接 400。
    // 另外本文件 :77 的默认值本来就是字符串 'metric'，改完两边才对得上。
    // （上一轮 lead 拍板-01「羚牛这里是数字 1，不去纠正」作废。）
    label: 'Metric',
    value: 'metric',
    pro: false,
  },
  // ---- 第六步 第4段 W0（阶段 0 · ck 试点）：追加「日志型」这一项，值照 fe v9.1.0
  // src/pages/alertRules/Form/constants.ts:103-107（label 'Log' / value 'logging' / pro false）。
  // 加它是为了让日志型数据源（elasticsearch / ck 的 logging 面 / 后续的 loki 等）能在
  // src/pages/alertRules/Form/Rule/Rule/Metric/index.tsx 的类型下拉里被筛出来。
  // 上面 Metric 那条羚牛写的是数字 1、而默认值（本文件 :77）是字符串 'metric'——两者对不上是羚牛存量写法，
  // 本轮不去纠正（lead 拍板-01），只在筛子里按「prod === 'logging' 才走日志分支、其余一律走指标分支」兜住。
  {
    label: 'Log',
    value: 'logging',
    pro: false,
  }
  // {
  //   label: '资产类型',
  //   value: 2,
  //   pro: false,
  // },
];

// ================= 第六步 第4段 W3a（阶段 1 收尾 · 挂点）=================
// 照 fe v9.1.0 `src/pages/alertRules/Form/constants.ts:7-48` 搬过来，**只改常量名**：
// fe 那份叫 `defaultRuleConfig`，pub 本文件 :3 已经有一个「按 prod 分」的同名对象（host / metric / logging / anomaly），
// 两者不是一回事，所以 fe 的那份在这里改名 `v9DefaultRuleConfig`。
// 依据：第六步-流水线/第4段/顾问答案/大顾问-Q4.md 第 4.1 节。
// 循环引用核过：`@/components/AdvancedWrap/utils` 只 import react / lodash / plus: / constants，不回头引 alertRules（fe 同样引法）。

// v9 新编辑器共用的 rule_config 骨架。
// 注意 `exp_trigger_disable: false` 不能少：FormNG/components/Triggers/Triggers.tsx:66 判 `=== false` 才渲染「触发条件」块，
// 缺了这个键（undefined）整块不显示。
export const v9DefaultRuleConfig = {
  queries: [{}],
  triggers: [
    {
      mode: 0,
      expressions: [
        {
          ref: 'A',
          comparisonOperator: '>',
          value: 0,
          logicalOperator: '&&',
        },
      ],
      severity: 2,
      recover_config: {
        judge_type: 1,
      },
    },
  ],
  exp_trigger_disable: false,
  nodata_trigger: {
    enable: false,
    severity: 2,
    resolve_after_enable: false,
    resolve_after: undefined,
  },
};

// 日志类数据源（allCates 里 type 含 'logging'）的恢复判断默认值是 0，其它类型是 1（fe:constants.ts:35-48）。
export const getDefaultRuleConfig = (cate: string) => {
  const isLogging = _.includes(_.find(allCates, { value: cate })?.type, 'logging');
  return {
    ...v9DefaultRuleConfig,
    triggers: _.map(v9DefaultRuleConfig.triggers, (triggerItem) => {
      return {
        ...triggerItem,
        recover_config: {
          judge_type: isLogging ? 0 : 1, // 日志类数据源默认值改为 0，其他类型数据源默认值为 1
        },
      };
    }),
  };
};
// ================= 第六步 第4段 W3a 结束 =================
