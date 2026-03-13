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
  } else if (_.includes(['aliyun-sls', 'ck', 'influxdb'], values.cate)) {
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
    // 新增/编辑：通知到业务组（后端字段）
    // - 编辑若为 null/undefined（旧规则且用户未选择），也按 false 传
    is_busi_notify: values?.is_busi_notify ?? false,
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
  } else if (_.includes(['aliyun-sls', 'ck', 'influxdb'], values.cate)) {
    values.rule_config.queries = _.map(values.rule_config.queries, (query) => {
      if (values.cate === 'aliyun-sls') {
        _.set(query, 'keys.valueKey', query?.keys?.valueKey ? _.split(query.keys.valueKey, ' ') : []);
      } else if (values.cate === 'ck') {
        _.set(query, 'keys.labelKey', query?.keys?.labelKey ? _.split(query.keys.labelKey, ' ') : []);
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
    is_busi_notify: _.get(values, 'is_busi_notify', false),
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
