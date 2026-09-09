import _ from 'lodash';
import moment from 'moment';
import { defaultRuleConfig, defaultValues } from './constants';
import { DATASOURCE_ALL, alphabet } from '../constants';
import { mapOptionToRelativeTimeRange, mapRelativeTimeRangeToOption } from '@/components/TimeRangePicker';

export function getFirstDatasourceId(datasourceIds = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0 ? datasourceList[0]?.id : datasourceIds[0];
}

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
