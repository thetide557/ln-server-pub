import React, { useEffect, useState } from 'react';
import MetricSelect from './FixMetricSelect';
import LabelFilters from './LabelFilters';
import { PromVisualQuery } from './types';
import { normalizeDefaultValue } from './utils';
import './style.less';
import { PlusCircleOutlined } from '@ant-design/icons';
import { GetAssetType } from '@/services/metric';
import { getAsset } from '@/services/assets';
import { Input, Tag } from 'antd';
import { buildPromVisualQueryFromPromQL } from '.';

export interface MetricItem {
  name: string;
  metric: string;
  query: PromVisualQuery;
}
interface IProps {
  datasourceValue: number;
  params: {
    start: number;
    end: number;
    match?: string[];
  };
  id: string;
  type?: string;
  item?: MetricItem[];
  rawQueryOpen?: boolean;
  onChange: (metrics: MetricItem[]) => void;
}

export default function index(props: IProps) {
  const { datasourceValue, params, rawQueryOpen = true, type, onChange, id } = props;
  const [optionalMetrics, setOptionalMetrics] = useState<string[]>([]);
  const [defaultMerics, setDefaultMerics] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<MetricItem[]>([]);

  function newMetric() {
    let queryContext = buildPromVisualQueryFromPromQL('');
    const query = normalizeDefaultValue(queryContext.query);
    metrics.push({
      metric: '',
      name: '',
      query: query,
    });
    setMetrics(metrics.slice());
  }

  useEffect(() => {
    GetAssetType().then(({ dat }) => {
      dat.forEach((element) => {
        if (element.name === type) {
          if (element.metrics != null && element.metrics.length > 0) {
            element.metrics.forEach((item) => {
              defaultMerics.push(item.name);
            });
            setDefaultMerics([...defaultMerics]);
          }
          if (element.optional_metrics != null && element.optional_metrics.length > 0) {
            element.optional_metrics.forEach((item) => {
              optionalMetrics.push(item);
            });
            setOptionalMetrics([...optionalMetrics]);
          }
        }
      });
    });
    getAsset(id).then(({ dat }) => {
      if (dat.optional_metrics != null && dat.optional_metrics.length > 0) {
        let current_metric: MetricItem[] = [];
        dat.optional_metrics.forEach((metric) => {
          let queryContext = buildPromVisualQueryFromPromQL(metric.metrics || '');
          current_metric.push({
            name: metric.name,
            metric: queryContext.query.metric as string,
            query: queryContext.query,
          });
        });
        setMetrics(current_metric);
      } else {
        newMetric();
      }
    });
  }, []);
  return (
    <div className='prom-query-builder-container'>
      <div
        style={{ marginLeft: '0px' }}
        onClick={() => {
          newMetric();
        }}
      >
        添加指标
        <PlusCircleOutlined style={{ paddingLeft: '2px' }} />
      </div>

      {metrics.map((item, index) => {
        return (
          <div key={index} className='prom-query-builder-metric-label-container1'>
            <div style={{ width: '40%', height: '65px', display: 'flex' }}>
              <MetricSelect
                datasourceValue={datasourceValue}
                params={{ match: [`{asset_type="${type}"}`], ...params }}
                value={item.metric}
                onChange={(val) => {
                  item.query.metric = val;
                  item.name = val;
                  setMetrics(metrics.slice());
                  onChange(metrics);
                }}
              />
            </div>
            <div style={{ height: '65px' }}>
              <Input
                className='metric_title'
                placeholder='填写名称'
                defaultValue={item.name}
                onChange={(e) => {
                  item.name = e.target.value;
                  onChange(metrics);
                }}
              />
            </div>
            <div
              className='metrics-titile-input-close_div'
              title='删除该指标'
              onClick={() => {
                metrics.splice(index, 1);
                setMetrics([...metrics]);
              }}
            >
              <span className='metrics-titile-input-close'>X</span>
            </div>
            <LabelFilters
              datasourceValue={datasourceValue}
              metric={item.query.metric}
              params={params}
              value={item.query.labels}
              onChange={(val) => {
                item.query.labels = val;
                onChange(metrics);
              }}
            />
          </div>
        );
      })}

      {/* {rawQueryOpen && <RawQuery query={query} datasourceValue={datasourceValue} />} */}
      <div className='prom-query-builder-operation-container' style={{ marginLeft: '0px' }}>
        默认指标：
        <div>
          {defaultMerics.map((item, index) => {
            return <Tag key={index}>{item}</Tag>;
          })}
        </div>
      </div>
    </div>
  );
}
