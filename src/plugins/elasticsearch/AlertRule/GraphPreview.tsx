import React, { useState, useRef, useEffect, useContext } from 'react';
import { Button, Popover, Form, Select, Space, Table } from 'antd';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

import { CommonStateContext } from '@/App';
import TimeRangePicker, { IRawTimeRange, parseRange } from '@/components/TimeRangePicker';

import { normalizeTime } from '../utils';
import { getDsQuery } from './services';

interface IProps {
  datasourceValue: number;
  data: any;
  disabled?: boolean;
  // 第六步 第4段 W1（规矩 A，出处 第4段/顾问问答-大顾问.md Q1 第二节）：
  // 下面这两个值 fe 原来是直接从表单**顶层**读的（:32 的 cate、:33 的 datasource_values）。
  // 羚牛的 cate 在每条策略上（['strategies', n, 'cate']），datasource_values 这个字段羚牛压根没有
  //（全仓 grep 只有本文件这一处），所以都改成由上层传进来；不传时退回 fe 原样从顶层读。
  cate?: string;
  datasourceValues?: number[];
}

const getSerieName = (metric: Object) => {
  let name = metric['__name__'] || '';
  _.forEach(_.omit(metric, '__name__'), (value, key) => {
    name += ` ${key}: ${value}`;
  });
  return _.trim(name);
};

export default function GraphPreview(props: IProps) {
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const { data, disabled, cate: cateProp, datasourceValues: datasourceValuesProp } = props;
  const divRef = useRef<HTMLDivElement>(null);
  // hook 不能条件调用，所以先照 fe 原样 watch 顶层字段，再优先用上层传进来的值
  //（写法同 pub 已有的 src/pages/alertRules/FormNG/components/Triggers/Triggers.tsx:35-37）
  const watchedCate = Form.useWatch('cate');
  const cate = cateProp ?? watchedCate;
  const watchedDatasourceValues = Form.useWatch('datasource_values');
  const datasource_values = datasourceValuesProp ?? watchedDatasourceValues;
  const [visible, setVisible] = useState(false);
  const [series, setSeries] = useState<any[]>([]);
  const [columnKeys, setColumnKeys] = useState<string[]>([]);
  const [datasourceValue, setDatasourceValue] = useState<number>(props.datasourceValue);
  const [range, setRange] = useState<IRawTimeRange>({
    start: 'now-1h',
    end: 'now',
  });

  const fetchSeries = () => {
    const parsedRange = parseRange(range);
    const start = moment(parsedRange.start).unix();
    const end = moment(parsedRange.end).unix();

    getDsQuery(
      {
        cate,
        datasource_id: datasourceValue,
        query: _.map([data], (item) => {
          const interval = normalizeTime(item.interval, item.interval_unit) ?? 300; // 默认5分钟
          return {
            ref: item.ref,
            index_type: item.index_type || 'index',
            index: item.index,
            index_pattern: item.index_pattern,
            filter: item.filter,
            value: item.value,
            group_by: item.group_by,
            date_field: item.date_field,
            offset: item.offset,
            interval,
            start,
            end,
          };
        }),
      },
      false,
    )
      .then((res) => {
        setSeries(
          _.map(res.dat, (item) => {
            return {
              id: _.uniqueId('series_'),
              name: getSerieName(item.metric),
              metric: item.metric,
              data: item.values,
            };
          }),
        );
        const keys: string[] = [];
        _.forEach(res.dat, (item) => {
          _.forEach(item.metric, (value, key) => {
            if (!_.includes(keys, key) && key !== '__name__') {
              keys.push(key);
            }
          });
        });
        setColumnKeys(keys);
      })
      .catch(() => {
        setSeries([]);
      });
  };

  useEffect(() => {
    setDatasourceValue(props.datasourceValue);
  }, [props.datasourceValue]);

  useEffect(() => {
    if (visible) {
      fetchSeries();
    }
  }, [JSON.stringify(range)]);

  return (
    <div ref={divRef}>
      <Popover
        placement='bottomLeft'
        visible={visible}
        onVisibleChange={(visible) => {
          setVisible(visible);
        }}
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                lineHeight: '32px',
              }}
            >
              {t('datasource:es.alert.query.preview')}
            </div>
            <Space>
              <span>{t('common:datasource.name')}:</span>
              <Select
                showSearch
                optionFilterProp='label'
                value={datasourceValue}
                onChange={(value) => {
                  setDatasourceValue(value);
                }}
                style={{ width: 200 }}
                options={_.map(
                  _.filter(groupedDatasourceList[cate], (item) => {
                    return _.includes(datasource_values, item.id);
                  }),
                  (item) => {
                    return {
                      label: item.name,
                      value: item.id,
                    };
                  },
                )}
              />
              <TimeRangePicker value={range} onChange={setRange} />
            </Space>
          </div>
        }
        content={
          <div style={{ width: 700 }}>
            <Table
              scroll={{ x: '700px' }}
              size='small'
              pagination={false}
              dataSource={series}
              columns={_.concat(
                {
                  title: 'Name',
                  render: (record) => {
                    return record.metric?.['__name__'] ?? '-';
                  },
                },
                _.map(columnKeys, (item) => {
                  return {
                    title: item,
                    render: (record) => {
                      return record.metric?.[item] ?? '-';
                    },
                  };
                }) as any[],
                {
                  title: 'Value',
                  render: (record) => {
                    return _.last(record.data)?.[1] ?? '-';
                  },
                },
              )}
            />
          </div>
        }
        trigger='click'
        getPopupContainer={() => divRef.current || document.body}
      >
        <Button
          size='small'
          type='primary'
          ghost
          onClick={() => {
            if (!visible && datasourceValue && data) {
              fetchSeries();
              setVisible(true);
            }
          }}
          disabled={disabled}
        >
          {t('datasource:es.alert.query.preview')}
        </Button>
      </Popover>
    </div>
  );
}
