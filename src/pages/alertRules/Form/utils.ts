import _ from 'lodash';
import moment from 'moment';
import { defaultRuleConfig, defaultValues } from './constants';
import { DATASOURCE_ALL, alphabet } from '../constants';
import { mapOptionToRelativeTimeRange, mapRelativeTimeRangeToOption } from '@/components/TimeRangePicker';

export function getFirstDatasourceId(datasourceIds = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0 ? datasourceList[0]?.id : datasourceIds[0];
}

// ================= 第六步 第4段 W2（阶段 2 · datasource_queries）=================
// 术语先解释一句：
//   `datasource_ids`     —— 老字段，一串数据源 id，`[0]` 表示「全部数据源」。
//   `datasource_queries` —— 夜莺 v9 的新字段，用「匹配条件」描述这条规则挑哪些数据源，
//                           形状 [{ match_type, op, values }]：
//                           match_type 0 = 按 id 精确、1 = 按名字通配、2 = 全部；op = 'in' / 'not in'。
// 判据正本：第六步-流水线/第4段/顾问答案/大顾问-Q3.md（第一、三、四、六节）
//           与 顾问问答.md Q3 的「lead 采纳情况（拍板-14）」。
//
// 口径（用户 M36 ① 拍板 + 拍板-14）：
//   * **新 8 种**（mysql / pgsql / doris / opensearch / loki / victorialogs / tdengine / iotdb）
//     —— 数据源筛选器换成 fe 的 V2，提交体**只发** `datasource_queries`；
//   * **其余（老类型）** —— 选择器、UI、提交体一个字不动，只在提交时**追加**一份等价的
//     `datasource_queries`，其余字段逐字节不变。
//   下面的 isLegacyCate 特意写成「不在新 8 种里就算老的」，而不是列一张老类型白名单：
//   这样将来冒出没见过的 cate（aliyun-sls / influxdb / host / 空值 …）都会走「老路 + 追加一个字段」，
//   永远不会意外改到存量类型的提交体。
export const NEW_DATASOURCE_QUERY_CATES = ['mysql', 'pgsql', 'doris', 'opensearch', 'loki', 'victorialogs', 'tdengine', 'iotdb'];

export const isLegacyCate = (cate?: string) => !_.includes(NEW_DATASOURCE_QUERY_CATES, cate);

// 与后端常量 models.DataSourceQueryAll 逐字段一致（ln-server/models/alert_rule.go:207-211，
// DatasourceIdAll = 0 见 models/common.go:13）；注意 values 是 [0]，不是 []。
export const DATASOURCE_QUERY_ALL = { match_type: 2, op: 'in', values: [DATASOURCE_ALL] };

// fe 的默认值，照 fe v9.1.0 src/pages/alertRules/Form/constants.ts:50-59（只取 datasource_queries 这一项）。
export const getDefaultDatasourceQueries = () => [{ match_type: 0, op: 'in', values: [] as number[] }];

/**
 * 老类型提交时：由 datasource_ids 单向生成等价的 datasource_queries（大顾问 Q3 第 1.2 节）。
 * 含 0（全部）  -> [{ match_type: 2, op: 'in', values: [0] }]
 * 非空不含 0    -> [{ match_type: 0, op: 'in', values: ids }]
 * 空            -> undefined（**不发**这个字段；后端 GetDatasourceIDsByDatasourceQueries 对空条件直接返回
 *                  nil（alert_rule.go:1626-1628），发一条空 query 反而会得到一条谁都匹配不上的哑规则）
 */
export function datasourceIdsToQueries(ids?: number[] | number) {
  const list = _.isArray(ids) ? ids : _.isNil(ids) ? [] : [ids];
  if (_.isEmpty(list)) return undefined;
  if (_.includes(list, DATASOURCE_ALL)) return [_.cloneDeep(DATASOURCE_QUERY_ALL)];
  return [{ match_type: 0, op: 'in', values: list }];
}

// tidwall/match 的通配符：* 匹配任意长度（含 0）的串，? 匹配单个字符（后端 models/alert_rule.go:15 引的库）。
function globToRegExp(pattern: string) {
  const esc = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${esc}$`);
}

/**
 * 把 datasource_queries 算成实际命中的数据源 id 列表。
 *
 * 为什么要在前端算：夜莺是调后端接口 POST /api/n9e/datasource/query 拿这个结果的
 *（fe:.../DatasourceValueSelect/V2.tsx:204-218），羚牛后端漏搬了这条路由
 *（基线 4f150ab7:center/router/router.go:290,327 有；羚牛 center/router/router.go 零命中），
 * 所以照后端同一套算法（ln-server/models/alert_rule.go:1625-1746）在前端复刻一份。
 * 逐条 query 取交集，初始集合是该类型的全部数据源（1630-1634）；某一轮空了就提前结束（1736-1738）。
 */
export function resolveDatasourceIdsByQueries(
  queries: { match_type: number; op: string; values: any[] }[] | undefined,
  datasourceList: { id: number; name: string }[] = [],
): number[] {
  if (_.isEmpty(queries) || _.isEmpty(datasourceList)) return [];
  let cur = _.map(datasourceList, 'id');
  for (const q of queries!) {
    let next: number[] = [];
    if (q?.match_type === 2) {
      next = cur; // 全部：不看 values（后端 1728-1732）
    } else if (q?.match_type === 0) {
      // values 里可能是数字 id，也可能是数据源名字：先按名字找，找不到再按数字解析（后端 1660-1673）
      const vals = _.filter(
        _.map(q.values, (v) => {
          const byName = _.find(datasourceList, { name: String(v) });
          return byName ? byName.id : Number(v);
        }),
        (n) => !_.isNaN(n),
      );
      if (q.op === 'not in') {
        next = _.difference(cur, vals); // 后端 1692-1697
      } else if (vals.length === 1 && vals[0] === DATASOURCE_ALL) {
        next = cur; // values 就是 [0] 时当「全部」（后端 1681-1685）
      } else {
        next = _.filter(vals, (v) => _.includes(cur, v)); // 保留用户选的顺序；已被删掉的 id 自然掉出
      }
    } else if (q?.match_type === 1) {
      const res = _.map(_.filter(q.values, _.isString), globToRegExp);
      const hitIds = _.map(
        _.filter(datasourceList, (ds) => _.includes(cur, ds.id) && _.some(res, (re) => re.test(ds.name))),
        'id',
      );
      next = q.op === 'not in' ? _.difference(cur, hitIds) : hitIds; // 后端 1698-1727
    }
    cur = next;
    if (_.isEmpty(cur)) break;
  }
  return cur;
}

// 新 8 种的编辑器要一个「单个数据源 id」（fe 里叫 datasource_value，是接口返回列表的第一个，
// fe:.../V2.tsx:206-217）。羚牛没有那条接口，就用上面本地算出来的列表取第一个，语义一致。
export const getDatasourceValueByQueries = (
  queries: { match_type: number; op: string; values: any[] }[] | undefined,
  datasourceList: { id: number; name: string }[] = [],
) => _.head(resolveDatasourceIdsByQueries(queries, datasourceList));
// ================= 第六步 第4段 W2 结束 =================

export const parseTimeToValueAndUnit = (value?: number) => {
  if (!value) {
    return {
      value: value,
      unit: 'min',
    };
  }
  let time = value / 60;
  if (time < 60) {
    return {
      value: time,
      unit: 'min',
    };
  }
  time = time / 60;
  if (time < 24) {
    return {
      value: time,
      unit: 'hour',
    };
  }
  time = time / 24;
  return {
    value: time,
    unit: 'day',
  };
};

export const normalizeTime = (value?: number, unit?: 'second' | 'min' | 'hour') => {
  if (!value) {
    return value;
  }
  if (unit === 'second') {
    return value;
  }
  if (unit === 'min') {
    return value * 60;
  }
  if (unit === 'hour') {
    return value * 60 * 60;
  }
  if (unit === 'day') {
    return value * 60 * 60 * 24;
  }
  return value;
};

export const stringifyExpressions = (
  expressions: {
    ref: string;
    label: string;
    comparisonOperator: string;
    value: string;
    logicalOperator?: string;
  }[],
) => {
  const logicalOperator = _.get(expressions, '[0].logicalOperator');
  let exp = '';
  _.forEach(expressions, (expression, index) => {
    if (index !== 0) {
      exp += ` ${logicalOperator} `;
    }
    exp += `$${expression.ref}${expression.label ? `.${expression.label}` : ''} ${expression.comparisonOperator} ${expression.value}`;
  });
  return exp;
};

// ---- 第六步 第4段 W0（lead 拍板-10，出处 第4段/顾问问答-大顾问.md Q1 第六节）----
// 「v9 新编辑器类型」= 用夜莺 v9 那套 AlertRule 编辑器（src/plugins/<t>/AlertRule/）配置的数据源类型。
// 它们的 rule_config.queries 形状和羚牛老 ck 编辑器不一样（没有 range 字段、keys 下三个键都是数组），
// 所以下面 processFormValues / processInitialValues 里给它们单开一个分支，照 fe v9.1.0 的写法处理。
// 本阶段只放 ck 一个；阶段 1 把其余类型接上编辑器之后，由 lead 往这个数组里加。
export const V9_EDITOR_CATES = ['ck'];

export function processFormValues(values) {
  let cate = values.cate;
  if (values.prod === 'host') {
    cate = 'host';
  } else if (values.prod === 'anomaly') {
    cate = 'prometheus';
  } else if (values.cate === 'elasticsearch' || values.cate === 'opensearch') {
    values.rule_config.queries = _.map(values.rule_config.queries, (item) => {
      return {
        ..._.omit(item, 'interval_unit'),
        interval: normalizeTime(item.interval, item.interval_unit),
      };
    });
    values.rule_config.triggers = _.map(values.rule_config.triggers, (trigger) => {
      if (trigger.mode === 0) {
        return {
          ...trigger,
          exp: stringifyExpressions(trigger.expressions),
        };
      }
      return trigger;
    });
  } else if (_.includes(V9_EDITOR_CATES, values.cate)) {
    // ---- 第六步 第4段 W0（拍板-10）：v9 新编辑器类型走这一支，内容照抄
    // fe v9.1.0 src/pages/alertRules/Form/utils.ts:98-140（queries 段 + triggers 段）。
    // 为什么必须单开：下面那条老分支对每条 query 无条件调 mapOptionToRelativeTimeRange(query.range)，
    // 而该函数第一行就读 option.start（src/components/TimeRangePicker/RelativeTimeRangePicker/utils.ts:14-17）；
    // v9 的 ck 编辑器（src/plugins/clickHouse/AlertRule/Queries/index.tsx）根本没有 range 字段，
    // 新建一条 ck 规则点保存就会 TypeError: Cannot read properties of undefined (reading 'start')。
    // 另外老分支的 `ref: alphabet[index]` 会把用户在 QueryName 里改过的查询别名按下标重写成 A/B/C，
    // 而触发条件的表达式是按 $别名 引用的，改名后会对不上——照 fe 抄就没有这一条。
    if (values?.rule_config?.queries) {
      values.rule_config.queries = _.map(values.rule_config.queries, (item) => {
        let parsedRange;
        if (item.range) {
          parsedRange = mapOptionToRelativeTimeRange(item.range);
        }
        // keys 下这三个键在编辑器里是 mode='tags' 的数组，提交给后端时拼成空格分隔的字符串
        if (_.isArray(item?.keys?.labelKey)) {
          item.keys.labelKey = _.join(item.keys.labelKey, ' ');
        }
        if (_.isArray(item?.keys?.valueKey)) {
          item.keys.valueKey = _.join(item.keys.valueKey, ' ');
        }
        if (_.isArray(item?.keys?.metricKey)) {
          item.keys.metricKey = _.join(item.keys.metricKey, ' ');
        }
        return {
          ..._.omit(item, ['interval_unit', 'range']),
          interval: item.interval_unit ? normalizeTime(item.interval, item.interval_unit) : undefined,
          from: parsedRange?.start,
          to: parsedRange?.end,
          cumulative_window_from: parsedRange?.cumulative_window_from,
          cumulative_window_to: parsedRange?.cumulative_window_to,
        };
      });
    }
    if (values?.rule_config?.triggers) {
      values.rule_config.triggers = _.map(values.rule_config.triggers, (trigger) => {
        if (trigger.mode === 0) {
          return {
            ...trigger,
            exp: stringifyExpressions(trigger.expressions),
          };
        }
        // 如果是表达式模式 mode=1 则清理掉 expressions 字段值
        if (trigger.mode === 1) {
          return {
            ...trigger,
            expressions: [{ ref: 'A', comparisonOperator: '>' }],
          };
        }
        return trigger;
      });
    }
  } else if (_.includes(['aliyun-sls', 'influxdb'], values.cate)) {
    values.rule_config.queries = _.map(values.rule_config.queries, (query, index) => {
      const parsedRange = mapOptionToRelativeTimeRange(query.range);
      if (cate === 'aliyun-sls') {
        if (query?.keys?.valueKey) {
          query.keys.valueKey = _.join(query.keys.valueKey, ' ');
        }
      }
      if (query?.keys?.labelKey) {
        query.keys.labelKey = _.join(query.keys.labelKey, ' ');
      }
      return {
        ..._.omit(query, 'range'),
        ref: alphabet[index],
        from: parsedRange?.start,
        to: parsedRange?.end,
      };
    });
    values.rule_config.triggers = _.map(values.rule_config.triggers, (trigger) => {
      if (trigger.mode === 0) {
        return {
          ...trigger,
          exp: stringifyExpressions(trigger.expressions),
        };
      }
      return trigger;
    });
  }
  const data = {
    ..._.omit(values, 'effective_time'),
    cate,
    enable_days_of_weeks: values.effective_time.map((item) => item.enable_days_of_week),
    enable_stimes: values.effective_time.map((item) => item.enable_stime.format('HH:mm')),
    enable_etimes: values.effective_time.map((item) => item.enable_etime.format('HH:mm')),
    disabled: !values.enable_status ? 1 : 0,
    notify_recovered: values.notify_recovered ? 1 : 0,
    enable_in_bg: values.enable_in_bg ? 1 : 0,
    callbacks: _.map(values.callbacks, (item) => item.url),
    datasource_ids: _.isArray(values.datasource_ids) ? values.datasource_ids : values.datasource_ids ? [values.datasource_ids] : [],
    annotations: _.chain(values.annotations).keyBy('key').mapValues('value').value(),
  };
  return data;
}

export function processInitialValues(values) {
  if (values.cate === 'elasticsearch' || values.cate === 'opensearch') {
    values.rule_config.queries = _.map(values.rule_config.queries, (item) => {
      return {
        ...item,
        interval: parseTimeToValueAndUnit(item.interval).value,
        interval_unit: parseTimeToValueAndUnit(item.interval).unit,
      };
    });
  } else if (_.includes(V9_EDITOR_CATES, values.cate)) {
    // ---- 第六步 第4段 W0（拍板-10）：v9 新编辑器类型的回填，照抄
    // fe v9.1.0 src/pages/alertRules/Form/utils.ts:188-214（queries 段）。
    // 与下面那条老分支的差别：三个 keys 都拆回数组（老分支只拆 labelKey），
    // range 只在 from / to 都有值时才拼（老分支无条件拼，from/to 为空时会拼出垃圾值）。
    if (values?.rule_config?.queries) {
      values.rule_config.queries = _.map(values.rule_config.queries, (item) => {
        if (item?.keys?.labelKey !== undefined) {
          _.set(item, 'keys.labelKey', item?.keys?.labelKey ? _.split(item.keys.labelKey, ' ') : []);
        }
        if (item?.keys?.valueKey !== undefined) {
          _.set(item, 'keys.valueKey', item?.keys?.valueKey ? _.split(item.keys.valueKey, ' ') : []);
        }
        if (item?.keys?.metricKey !== undefined) {
          _.set(item, 'keys.metricKey', item?.keys?.metricKey ? _.split(item.keys.metricKey, ' ') : []);
        }
        return {
          ..._.omit(item, ['from', 'to']),
          interval: item.interval ? parseTimeToValueAndUnit(item.interval).value : undefined,
          interval_unit: item.interval ? parseTimeToValueAndUnit(item.interval).unit : undefined,
          range:
            item.from !== undefined && item.to !== undefined
              ? mapRelativeTimeRangeToOption({
                  start: item.from,
                  end: item.to,
                  cumulative_window_from: item.cumulative_window_from,
                  cumulative_window_to: item.cumulative_window_to,
                })
              : undefined,
        };
      });
    }
  } else if (_.includes(['aliyun-sls', 'influxdb'], values.cate)) {
    values.rule_config.queries = _.map(values.rule_config.queries, (query) => {
      if (values.cate === 'aliyun-sls') {
        _.set(query, 'keys.valueKey', query?.keys?.valueKey ? _.split(query.keys.valueKey, ' ') : []);
      }
      return {
        ..._.omit(query, ['from', 'to']),
        range: mapRelativeTimeRangeToOption({
          start: query.from,
          end: query.to,
        }),
      };
    });
  }
  return {
    ...values,
    enable_in_bg: values?.enable_in_bg === 1,
    enable_status: values?.disabled === undefined ? true : !values?.disabled,
    notify_recovered: values?.notify_recovered === 1 || values?.notify_recovered === undefined ? true : false, // 1:启用 0:禁用
    callbacks: !_.isEmpty(values?.callbacks)
      ? values.callbacks.map((item) => ({
          url: item,
        }))
      : undefined,
    effective_time: values?.enable_etimes // TODO: 兼容旧数据
      ? values?.enable_etimes.map((item, index) => ({
          enable_stime: moment(values.enable_stimes[index], 'HH:mm'),
          enable_etime: moment(values.enable_etimes[index], 'HH:mm'),
          enable_days_of_week: values.enable_days_of_weeks[index],
        }))
      : defaultValues.effective_time,
    annotations: _.map(values?.annotations, (value, key) => ({
      key,
      value,
    })),
  };
}

export function getDefaultValuesByProd(prod, defaultBrainParams) {
  if (prod === 'host') {
    return {
      prod,
      cate: 'host',
      datasource_ids: undefined,
      rule_config: defaultRuleConfig.host,
    };
  }
  if (prod === 'anomaly') {
    return {
      prod,
      cate: 'prometheus',
      datasource_ids: [DATASOURCE_ALL],
      rule_config: {
        ...defaultRuleConfig.anomaly,
        algo_params: defaultBrainParams?.holtwinters || {},
      },
    };
  }
  if (prod === 'metric') {
    return {
      prod,
      cate: 'prometheus',
      datasource_ids: [DATASOURCE_ALL],
      rule_config: defaultRuleConfig.metric,
    };
  }
  if (prod === 'logging') {
    return {
      prod,
      cate: 'elasticsearch',
      datasource_ids: undefined,
      rule_config: defaultRuleConfig.logging,
    };
  }
}

export function getDefaultValuesByCate(prod, cate) {
  // ---- 第六步 第4段 W2（阶段 2）：新 8 种切过来时，给一份空的数据源筛选条件（形状照
  // fe v9.1.0 src/pages/alertRules/Form/constants.ts:50-59），别的什么都不给：
  //   * 不给 datasource_ids —— 新 8 种的提交体里不该有这个老字段；
  //   * rule_config 留给阶段 1 —— 谁把某个类型的编辑器挂上来，谁在这里补它自己的 rule_config 默认值
  //     （照阶段 0 的 ck 分支那样单开一支，或在这里按 cate 分流）。
  // 老类型（prometheus / elasticsearch / ck / influxdb / aliyun-sls …）一个字不动：
  // 它们的提交体必须逐字节保持原样，只在提交时追加一个等价的 datasource_queries。
  if (!isLegacyCate(cate)) {
    return {
      prod,
      cate,
      datasource_queries: getDefaultDatasourceQueries(),
    };
  }
  if (cate === 'prometheus') {
    return {
      prod,
      cate,
      datasource_ids: [DATASOURCE_ALL],
      rule_config: defaultRuleConfig.metric,
    };
  }
  // ---- 第六步 第4段 W0（阶段 0 · ck 试点）：给 ck 单开一个分支，放在原来的 `ck || influxdb` 之前。
  // 为什么要单开：fe v9.1.0 的 ck 告警编辑器（src/plugins/clickHouse/AlertRule/）要的 rule_config 形状，
  // 比下面这个羚牛存量默认值多四样东西，缺了界面会不对：
  //   1) queries: [{ ref: 'A' }]  —— 查询卡片列表；缺了虽然 Form.List 的 initialValue 兜得住，但显式给更稳
  //   2) exp_trigger_disable: false —— **最要紧的一个**。搬进来的 Triggers.tsx:58 判的是 `exp_trigger_disable === false`
  //      （严格等于 false 才展开「触发条件」那块），undefined 会让整块触发条件静默不显示。
  //   3) nodata_trigger: {...} —— 「无数据告警」那块开关的初值（Triggers.tsx:112 读它）
  //   4) triggers[].recover_config.judge_type —— 恢复判断方式。照 fe 的 getDefaultRuleConfig
  //      （fe:src/pages/alertRules/Form/constants.ts:35-48）：日志类数据源给 0、其余给 1；
  //      ck 在本仓 src/components/AdvancedWrap/utils.ts 里 type 含 'logging'，所以给 0。
  // fe 自己没有 ck 的专门分支，ck 落到 fe utils.ts:445-452 的兜底，拿的就是完整的 defaultRuleConfig
  //（fe:src/pages/alertRules/Form/constants.ts:7-33）——下面这份就是照它抄的。
  // influxdb 走原来那条分支，一个字不动。
  if (cate === 'ck') {
    return {
      prod,
      cate,
      datasource_ids: undefined,
      rule_config: {
        queries: [
          {
            ref: 'A',
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
            recover_config: {
              judge_type: 0,
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
      },
    };
  }
  if (cate === 'ck' || cate === 'influxdb') {
    return {
      prod,
      cate,
      datasource_ids: undefined,
      rule_config: {
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
    };
  }
}


// 告警规则数据转换
export function transformAlertRules(originalData) {
  if (!originalData || originalData.length === 0) return null;

  // 基础配置字段列表
  const baseFields = [
    "strategy_id",
    "name",
    "asset_id",
    "excludes",
    "append_tags",
    "note",
  ];

  // 创建结果对象
  const result: any = {};
  baseFields.forEach((field) => {
    result[field] = originalData[0][field];
  });

  // 添加策略数组
  result.strategies = originalData.map((item) => {
    const strategyItem = { ...item };

    baseFields.forEach((field) => {
      delete strategyItem[field];
    });

    return strategyItem;
  });

  return result;
}

export function transformStrategyData(transformedData) {
  if (!transformedData || !transformedData.strategies) return [];

  const baseFields = [
    "strategy_id",
    "name",
    "asset_id",
    "excludes",
    "append_tags",
    "note",
  ];

  // 创建基础配置对象
  const baseData = {};
  baseFields.forEach((field) => {
    baseData[field] = transformedData[field];
  });

  // 为每个策略项合并基础配置
  return transformedData.strategies.map((strategyItem) => {
    return {
      ...baseData,
      ...strategyItem,
    };
  });
}
