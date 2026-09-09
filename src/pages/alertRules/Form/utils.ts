import _ from 'lodash';
import moment from 'moment';
import { defaultRuleConfig, defaultValues, getDefaultRuleConfig } from './constants';
// 第六步 第4段 W3a：victorialogs 的查询默认值（fe:utils.ts:9 同样引法），pub 已有这个常量。
import { DEFAULT_QUERY as VICTORIALOGS_DEFAULT_QUERY } from '@/plugins/victorialogs/constants';
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

// 第六步 第4段 W3a（拍板-27，大顾问 Q4 第三节末）：整段换成 fe v9.1.0 src/pages/alertRules/Form/utils.ts:17-43 的版本（逐字）。
// 原 pub 版先除 60、单位只有 min / hour / day：存 30 秒会回填成「0.5 min」，存 86400 会回填成「1 day」，
// 而 v9 编辑器（ES / TDengine / iotdb / doris）的单位下拉只有 second / min / hour，day 显示成空。
// ≥ 60 秒且 < 1 天的取值两版结果相同，所以老 ck 规则的回填不变；prometheus 不经过这个函数。
export const parseTimeToValueAndUnit = (value?: number) => {
  if (!value) {
    return {
      value: value,
      unit: 'min',
    };
  }
  let time = value;
  if (time < 60) {
    return {
      value,
      unit: 'second',
    };
  }
  time = time / 60;
  if (time < 60) {
    return {
      value: time,
      unit: 'min',
    };
  }
  time = time / 60;
  return {
    value: time,
    unit: 'hour',
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
// 第六步 第4段 W3a（阶段 1 收尾）：由阶段 0 的一个 ck 扩到十种。
// 十种 = fe v9.1.0 老表单 Form/Rule/Rule/index.tsx:40-49 分发到的全部非 prometheus 类型；
// fe 对它们不分类型、统一走 utils.ts:98-140 / :188-214 那段通用处理，这里照抄。
// loki 用的是老表单自带的 Log/Loki 编辑器、rule_config 只有 queries[].{prom_ql,severity}（fe utils.ts:392-407），
// 通用段对它只会多出几个 undefined 键（interval/from/to/cumulative_window_*），JSON 序列化时自动丢掉，与 fe 行为一致。
// 依据：第六步-流水线/第4段/顾问答案/大顾问-Q4.md 第二节。
export const V9_EDITOR_CATES = ['ck', 'mysql', 'pgsql', 'tdengine', 'iotdb', 'elasticsearch', 'opensearch', 'doris', 'victorialogs', 'loki'];

export function processFormValues(values) {
  let cate = values.cate;
  if (values.prod === 'host') {
    cate = 'host';
  } else if (values.prod === 'anomaly') {
    cate = 'prometheus';
    // 第六步 第4段 W3a：这一段是 fork 点 c65a5fdf9 上游 fe 的 v6 代码（逐字相同），fe 已在 725ad443b 并入通用段；
    // ES / opensearch 进 V9_EDITOR_CATES 之后条件永假，留作对照不删（大顾问 Q4 第三节）。
  } else if ((values.cate === 'elasticsearch' || values.cate === 'opensearch') && !_.includes(V9_EDITOR_CATES, values.cate)) {
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
  // ---- 第六步 第4段 W2（阶段 2）：数据源字段。上面那段构造 data 的原文一行没改
  // （尤其是 datasource_ids 那一行：它把 undefined 变成 []、把单个值包成数组，host 与老类型都靠它）。
  // 判据：顾问答案/大顾问-Q3.md 第六节第 5 条 + 顾问问答.md Q3 拍板-14。
  //   * host 规则：后端根本不看数据源（ln-server/alert/eval/alert_rule.go:120-127），一个字节都不加；
  //   * 老类型：提交体 = 原来的全部字段 + datasource_queries 这一个字段，其余逐字节不变。
  //     为什么必须补：羚牛的求值引擎对 ck / elasticsearch 这些「内置类型」只看 datasource_queries
  //     （ln-server/alert/eval/alert_rule.go:132、models/alert_rule.go:1233-1244），
  //     而后端任何入口都不会把 datasource_ids 翻译成 datasource_queries，
  //     所以现在从 pub 表单建的 ck / es 规则其实一个数据源都匹配不上（大顾问 Q3 第 1.1 节末段）。
  //   * 新 8 种：只发 datasource_queries，老字段删掉（照 fe v9.1.0 Form/utils.ts:184-187 的精神）。
  // dataOut 和 data 是同一个对象，只是换一个 any 类型的名字：datasource_queries 不在上面那个字面量里，
  // TypeScript 会拦「给不存在的属性赋值」和「delete 非可选属性」（tsconfig.json:23,34 开了 strict / strictNullChecks）。
  const dataOut = data as any;
  if (values.prod !== 'host') {
    if (isLegacyCate(cate)) {
      const legacyQueries = datasourceIdsToQueries(data.datasource_ids);
      if (legacyQueries) {
        dataOut.datasource_queries = legacyQueries;
      } else {
        // 数据源一个都没选（老选择器的 required 一般先拦住了）：不发空条件，
        // 因为后端拿到空条件会当成「一个数据源都不匹配」（models/alert_rule.go:1626-1628）。
        delete dataOut.datasource_queries;
      }
    } else {
      delete dataOut.datasource_ids;
      dataOut.datasource_queries = values.datasource_queries?.length ? values.datasource_queries : getDefaultDatasourceQueries();
    }
  }
  return data;
}

export function processInitialValues(values) {
  // ---- 第六步 第4段 W2（阶段 2）：回填时两个数据源字段要分开走。
  // pub 的编辑页拿的是 GET /api/n9e/alert-rule/strategy/:id（src/services/warning.ts:141-145），
  // 后端那条链路把 datasource_ids 和 datasource_queries **原样**返回、不做任何翻译
  //（ln-server/center/router/router_alert_rule.go:1146-1179），所以两个字段都可能有值。
  //   * host / 老类型：表单只认 datasource_ids，把 datasource_queries 从表单值里删掉，
  //     免得一份用不上的旧值跟着提交出去；提交时会由 ids 重新算一份等价的。
  //   * 新 8 种：删掉 datasource_ids（照 fe v9.1.0 Form/utils.ts:184-187），
  //     datasource_queries 为空时给一份 fe 的默认值，免得筛选器空着。
  if (values?.prod === 'host' || isLegacyCate(values?.cate)) {
    delete values.datasource_queries;
  } else {
    delete values.datasource_ids;
    if (_.isEmpty(values.datasource_queries)) {
      values.datasource_queries = getDefaultDatasourceQueries();
    }
  }
  // 第六步 第4段 W3a：同上，fork 点上游 v6 回填分支，条件永假，留作对照（大顾问 Q4 第三节）。
  if ((values.cate === 'elasticsearch' || values.cate === 'opensearch') && !_.includes(V9_EDITOR_CATES, values.cate)) {
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
    // 第六步 第4段 W3a（大顾问 Q4 第 4.3 节）：原来直接返回 constants.ts 里 v6 形状的 defaultRuleConfig.logging，
    // 那份没有 exp_trigger_disable，用户在产品类型点「Log」的那一刻拿到它，v9 ES 编辑器的「触发条件」块
    // 会整块不显示（FormNG/components/Triggers/Triggers.tsx:66 判 === false）。改成委托给切类型走的同一份默认值。
    // datasource_ids 两边都是 undefined，提交体不变；constants.ts 的 defaultRuleConfig.logging 留着不删。
    return getDefaultValuesByCate(prod, 'elasticsearch');
  }
}

export function getDefaultValuesByCate(prod, cate) {
  // ---- 第六步 第4段 W2（阶段 2）当时的说明，留作沿革；这一段的写法已由下面的 W3a 改掉 ----
  // 新 8 种切过来时，给一份空的数据源筛选条件（形状照
  // fe v9.1.0 src/pages/alertRules/Form/constants.ts:50-59），别的什么都不给：
  //   * 不给 datasource_ids —— 新 8 种的提交体里不该有这个老字段；
  //   * rule_config 留给阶段 1 —— 谁把某个类型的编辑器挂上来，谁在这里补它自己的 rule_config 默认值
  //     （照阶段 0 的 ck 分支那样单开一支，或在这里按 cate 分流）。
  // 老类型（prometheus / elasticsearch / ck / influxdb / aliyun-sls …）一个字不动：
  // 它们的提交体必须逐字节保持原样，只在提交时追加一个等价的 datasource_queries。
  // 第六步 第4段 W3a（阶段 1 收尾）：W2 原来在这里直接返回「只有 datasource_queries、没有 rule_config」，
  // 并留了一句「rule_config 留给阶段 1」。阶段 1 把十种编辑器都挂上了，所以改成下面统一的写法：
  //   数据源字段  —— 新 8 种给 datasource_queries、老类型给 datasource_ids（isLegacyCate 判，W2 的口径一字不改）；
  //   rule_config —— 照 fe v9.1.0 的 getDefaultValuesByCate 给（大顾问 Q4 第 4.2 节）。
  const datasourceDefaults = isLegacyCate(cate) ? { datasource_ids: undefined } : { datasource_queries: getDefaultDatasourceQueries() };
  if (cate === 'prometheus') {
    return {
      prod,
      cate,
      datasource_ids: [DATASOURCE_ALL],
      rule_config: defaultRuleConfig.metric,
    };
  }
  // ---- 第六步 第4段 W3a（阶段 1 收尾，大顾问 Q4 第 4.2 节）----
  // 阶段 0 给 ck 手写过一段完整默认值；阶段 1 十种类型都要，写十遍没必要，改成「骨架 + 各自的 queries」：
  //   骨架 = getDefaultRuleConfig(cate)（constants.ts，照 fe v9.1.0 constants.ts:7-48 搬），它管
  //          triggers / exp_trigger_disable / nodata_trigger，并按数据源是不是日志型决定 recover_config.judge_type（0 / 1）；
  //   queries = 下面这张表，每一行的出处写在行尾（fe v9.1.0 src/pages/alertRules/Form/utils.ts 的行号）。
  // ck 原来手写的那份与「骨架 + [{ ref: 'A' }]」逐字段相同（ck 在 AdvancedWrap/utils.ts:83 的 type 含 'logging'，
  // 所以 judge_type 同样是 0），所以这次替换对 ck 的提交体没有任何改变。
  // loki 不走这张表：它用的是老表单自带的 Log/Loki 编辑器，rule_config 里只有 queries，没有触发条件块（见下）。
  const V9_DEFAULT_QUERIES: Record<string, any[]> = {
    elasticsearch: [{ ref: 'A', interval_unit: 'min', interval: 5, date_field: '@timestamp', value: { func: 'count' } }], // fe :312-332
    opensearch: [{ ref: 'A', interval_unit: 'min', interval: 5, date_field: '@timestamp', value: { func: 'count' } }], // fe :333-353
    tdengine: [{ ref: 'A', interval: 1, interval_unit: 'min' }], // fe :354-370
    iotdb: [{ ref: 'A', interval: 1, interval_unit: 'min', keys: { timeKey: 'time', timeFormat: '2006-01-02T15:04:05' } }], // fe :371-391
    doris: [{ ref: 'A', interval: 1, interval_unit: 'min' }], // fe :408-424
    victorialogs: [{ ref: 'A', query: VICTORIALOGS_DEFAULT_QUERY }], // fe :425-440
    ck: [{ ref: 'A' }], // fe 无专门分支，走 :445-452 兜底的 queries: [{}]；阶段 0 已用 [{ ref: 'A' }]，保留
    mysql: [{ ref: 'A' }], // 同上
    pgsql: [{ ref: 'A' }], // 同上
  };

  // loki：fe :392-407 只给 queries，不带 triggers / exp_trigger_disable / nodata_trigger
  //（老表单自带的 Loki 编辑器没有触发条件块，每条查询自己带 severity）。
  if (cate === 'loki') {
    return {
      prod,
      cate,
      ...datasourceDefaults,
      rule_config: {
        queries: [
          {
            prom_ql: '',
            severity: 2,
          },
        ],
      },
    };
  }

  if (_.includes(V9_EDITOR_CATES, cate)) {
    return {
      prod,
      cate,
      ...datasourceDefaults,
      rule_config: {
        ...getDefaultRuleConfig(cate),
        queries: V9_DEFAULT_QUERIES[cate] ?? [{ ref: 'A' }],
      },
    };
  }

  // 兜底：将来冒出没见过的新类型（不在老 5 种里、也还没挂编辑器）时，仍按 W2 的口径只给数据源筛选条件。
  if (!isLegacyCate(cate)) {
    return {
      prod,
      cate,
      datasource_queries: getDefaultDatasourceQueries(),
    };
  }

  // ---- 下面这段是羚牛存量的 influxdb 默认值，一个字不动；只把原来一起写在条件里的 `cate === 'ck' ||` 去掉
  // （ck 已由上面的 V9 分支接管，走不到这里）。
  if (cate === 'influxdb') {
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
