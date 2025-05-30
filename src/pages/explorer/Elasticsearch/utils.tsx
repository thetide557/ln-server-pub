import React from 'react';
import _ from 'lodash';
import moment from 'moment';
import { measureTextWidth } from '@ant-design/plots';
import flatten from './flatten';

function localeCompareFunc(a, b) {
  return a.localeCompare(b);
}

export function getFieldLabel(fieldKey: string, fieldConfig?: any) {
  return fieldConfig?.attrs?.[fieldKey]?.alias || fieldKey;
}

export function getFieldType(fieldKey: string, fieldConfig?: any) {
  return fieldConfig?.formatMap?.[fieldKey]?.type;
}

export function getFieldValue(fieldKey, fieldValue, fieldConfig?: any) {
  const format = fieldConfig?.formatMap?.[fieldKey];
  if (format && format?.type === 'date' && format?.params?.pattern) {
    return moment(fieldValue).format(format?.params?.pattern);
  }
  return fieldValue;
}

export function normalizeLogs(logs: { [index: string]: string }, fieldConfig?: any) {
  const logsClone = _.cloneDeep(logs);
  _.forEach(logsClone, (item, key) => {
    const label = getFieldLabel(key, fieldConfig);
    logsClone[label] = getFieldValue(key, item, fieldConfig);
    if (label !== key) {
      delete logsClone[key];
    }
  });
  return logsClone;
}

export function getColumnsFromFields(selectedFields: string[], dateField?: string, fieldConfig?: any) {
  let columns: any[] = [];
  if (_.isEmpty(selectedFields)) {
    columns = [
      {
        title: 'Document',
        dataIndex: 'fields',
        render(text) {
          return (
            <dl className='es-discover-logs-row'>
              {_.map(text, (val, key) => {
                const label = getFieldLabel(key, fieldConfig);
                const value = _.isArray(val) ? _.join(val, ',') : getFieldValue(key, val, fieldConfig);
                return (
                  <React.Fragment key={label}>
                    <dt>{label}:</dt> <dd>{value}</dd>
                  </React.Fragment>
                );
              })}
            </dl>
          );
        },
      },
    ];
  } else {
    columns = _.map(selectedFields, (item) => {
      const label: string = getFieldLabel(item, fieldConfig);
      return {
        title: getFieldLabel(item, fieldConfig),
        dataIndex: 'fields',
        key: item,
        render: (fields) => {
          const fieldVal = getFieldValue(item, fields[item], fieldConfig);
          const value = _.isArray(fieldVal) ? _.join(fieldVal, ',') : fieldVal;
          return (
            <div
              style={{
                minWidth: measureTextWidth(label) + 30, // sorter width
              }}
            >
              {value}
            </div>
          );
        },
        sorter: (a, b) => localeCompareFunc(_.join(_.get(a, `fields[${item}]`, '')), _.join(_.get(b, `fields[${item}]`, ''))),
      };
    });
  }
  if (dateField) {
    columns.unshift({
      title: 'Time',
      dataIndex: 'fields',
      key: 'time',
      width: 200,
      render: (fields) => {
        const format = fieldConfig?.formatMap?.[dateField];
        return getFieldValue(dateField, fields[dateField], {
          formatMap: {
            [dateField]: {
              type: 'date',
              params: {
                pattern: format?.params?.pattern || 'YYYY-MM-DD HH:mm:ss',
              },
            },
          },
        });
      },
      defaultSortOrder: 'descend',
      sortDirections: ['ascend', 'descend', 'ascend'],
      sorter: true,
    });
  }
  return columns;
}

interface Mappings {
  [index: string]: {
    properties: {
      [key: string]:
        | {
            type: string;
          }
        | Mappings;
    };
  };
}

const typeMap: Record<string, string> = {
  float: 'number',
  double: 'number',
  integer: 'number',
  long: 'number',
  date: 'date',
  date_nanos: 'date',
  string: 'string',
  text: 'string',
  scaled_float: 'number',
  nested: 'nested',
  histogram: 'number',
};

export function mappingsToFields(mappings: Mappings, type?: string) {
  const fields: string[] = [];
  _.forEach(mappings, (item: any) => {
    function loop(mappings, prefix = '') {
      // mappings?.doc?.properties 为了兼容 6.x 版本接口
      _.forEach(mappings?.doc?.properties || mappings?.properties, (item, key) => {
        if (item.type) {
          if (typeMap[item.type] === type || !type) {
            fields.push(`${prefix}${key}`);
          }
        } else {
          loop(item, `${prefix}${key}.`);
        }
      });
    }
    loop(item.mappings);
  });
  return _.sortBy(_.union(fields));
}

export function mappingsToFullFields(mappings: Mappings, type?: string) {
  const fields: any[] = [];
  _.forEach(mappings, (item: any) => {
    function loop(mappings, prefix = '') {
      // mappings?.doc?.properties 为了兼容 6.x 版本接口
      _.forEach(mappings?.doc?.properties || mappings?.properties, (item, key) => {
        if (item.type) {
          if (typeMap[item.type] === type || !type) {
            fields.push({
              ...item,
              name: `${prefix}${key}`,
            });
          }
        } else {
          loop(item, `${prefix}${key}.`);
        }
      });
    }
    loop(item.mappings);
  });
  return _.sortBy(_.union(fields));
}

const PERCENTILE_FUNCS = ["p90", "p95", "p99"];
export function normalizeLogsQueryRequestBody(params: any) {
  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: params.index,
  };
  const body: any = {
    size: params.limit,
    query: {
      bool: {
        filter: [
          {
            range: {
              [params.date_field]: {
                gte: params.start,
                lte: params.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    sort: [
      {
        [params.date_field]: {
          order: params.order || 'desc',
          unmapped_type: 'boolean',
        },
      },
    ],
    script_fields: {},
    aggs: {},
  };
  if (params.filter) {
    body.query.bool.filter.push({
      query_string: {
        analyze_wildcard: true,
        query: params.filter || '*',
      },
    });
  }
  if (params.termsKey && params.termsValue) {
    body.query.bool.filter.push({
      term: {
        [params.termsKey]: params.termsValue,
      },
    });
  }
  
  const isPercentile = PERCENTILE_FUNCS.includes(params.func);
  const aggType = isPercentile ? 'percentiles' : params.func;
  const getPercents = () => {
    if (params.func === 'p90') return [90];
    if (params.func === 'p95') return [95];
    if (params.func === 'p99') return [99];
  };

  if (params.groupBy) {
    params.groupBy.forEach((item) => {
      body.aggs[`terms_${item.field}`] = {
        terms: {
          // TODO:field、order参数怎么传递的
          field: `${item.field}`,
          size: item.size,
          min_doc_count: item.min_value,
          order: item.orderBy && item.order ? { [item.orderBy]: item.order } : { _count: 'desc' },
        },
        aggs: {},
      };
      // 动态构建聚合操作
      if (params.func !== "count" && params.funcField) {
        body.aggs[`terms_${item.field}`].aggs = {
          [params.func + "_" + params.funcField]: {
            [aggType]: {
              field: params.funcField,
              ...(isPercentile ? { percents: getPercents() } : {}),
              ...(isPercentile ? { tdigest: { compression: 200 } } : {}),
            },
          },
        };
      }
      // 添加告警条件
      console.log('告警条件', params.alertCondition);
      if (
        params.alertCondition &&
        Array.isArray(params.alertCondition) &&
        params.alertCondition.length > 0
      ) {
        let alertScript = params.alertCondition
          .map((condition, index) => {
            // 拼接每个条件
            let operator = condition.comparisonOperator || "";
            let value = condition.value || "";
            return `params.value ${operator} ${value}`;
          })
          .join(` ${params.alertCondition[0].logicalOperator} `); // 使用第一个条件的逻辑操作符连接所有条件
          console.log('告警条件22222', alertScript);  
        body.aggs[`terms_${item.field}`].aggs[
          `${params.func + "_" + params.funcField}_filter`
        ] = {
          bucket_selector: {
            buckets_path: {
              value: `${params.func + "_" + params.funcField}`, // 假设每个聚合都有一个.value 属性
            },
            script: alertScript,
          },
        };
      }
    });
  } else if (params.func !== "count" && params.funcField) {
      body.aggs = {
        ...body.aggs,
        [params.func + "_" + params.funcField]: {
          [aggType]: {
            field: params.funcField,
            ...(isPercentile ? { percents: getPercents() } : {}),
          },
        },
      };
      // if (
      //   params.alertCondition &&
      //   Array.isArray(params.alertCondition) &&
      //   params.alertCondition.length > 0
      // ) {
      //   let alertScript = params.alertCondition
      //     .map((condition, index) => {
      //       // 拼接每个条件
      //       let operator = condition.comparisonOperator || "";
      //       let value = condition.value || "";
      //       return `params.value ${operator} ${value}`;
      //     })
      //     .join(` ${params.alertCondition[0].logicalOperator} `); // 使用第一个条件的逻辑操作符连接所有条件
      //     console.log('告警条件22222', alertScript);  
      //   body.aggs[
      //     `${params.func + "_" + params.funcField}_filter`
      //   ] = {
      //     bucket_selector: {
      //       buckets_path: {
      //         value: `${params.func + "_" + params.funcField}`, 
      //       },
      //       script: alertScript,
      //     },
      //   };
      // }
    }
  
  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

export function normalizeFieldValuesQueryRequestBody(params: any, field: string) {
  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: params.index,
  };
  const body: any = {
    size: params.limit,
    query: {
      bool: {
        filter: [
          {
            range: {
              [params.date_field]: {
                gte: params.start,
                lte: params.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    sort: [
      {
        [params.date_field]: {
          order: params.order || 'desc',
          unmapped_type: 'boolean',
        },
      },
    ],
    script_fields: {},
    fields: [field],
    aggs: {},
    _source: false,
  };
  if (params.filter) {
    body.query.bool.filter.push({
      query_string: {
        analyze_wildcard: true,
        query: params.filter || '*',
      },
    });
  }
  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

export function normalizeTimeseriesQueryRequestBody(params: any, intervalkey: string) {
  const header = {
    search_type: 'query_then_fetch',
    ignore_unavailable: true,
    index: params.index,
  };
  const body: any = {
    size: params.limit,
    query: {
      bool: {
        filter: [
          {
            range: {
              [params.date_field]: {
                gte: params.start,
                lte: params.end,
                format: 'epoch_millis',
              },
            },
          },
        ],
      },
    },
    script_fields: {},
    _source: false,
    aggs: {
      A: {
        date_histogram: {
          field: params.date_field,
          min_doc_count: 0,
          extended_bounds: {
            min: params.start,
            max: params.end,
          },
          format: 'epoch_millis',
          [intervalkey]: params.interval,
        },
        aggs: {},
      },
    },
  };
  if (params.filter) {
    body.query.bool.filter.push({
      query_string: {
        analyze_wildcard: true,
        query: params.filter || '*',
      },
    });
  }
  return `${JSON.stringify(header)}\n${JSON.stringify(body)}\n`;
}

export const flattenHits = (hits: any[]): { docs: Array<Record<string, any>>; propNames: string[] } => {
  const docs: any[] = [];
  let propNames: string[] = [];

  for (const hit of hits) {
    const flattened = hit._source ? flatten(hit._source) : {};
    const doc = {
      _id: hit._id,
      _type: hit._type,
      _index: hit._index,
      sort: hit.sort,
      highlight: hit.highlight,
      _source: { ...flattened },
      fields: { ...flattened },
    };

    for (const propName of Object.keys(doc)) {
      if (propNames.indexOf(propName) === -1) {
        propNames.push(propName);
      }
    }

    docs.push(doc);
  }

  propNames.sort();
  return { docs, propNames };
};
