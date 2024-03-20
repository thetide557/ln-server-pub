import React, { useState, useEffect } from 'react';
import { AutoComplete } from 'antd';
import _ from 'lodash';
import { getMetric } from '@/services/dashboardV2';
import FormItem from '../components/FormItem';

interface IProps {
  datasourceValue: number;
  params: {
    start: number;
    end: number;
    match?: string[];
  };
  value?: string;
  onChange: (val: string) => void;
}

export default function index(props: IProps) {
  const { datasourceValue, params, value, onChange } = props;
  const [metricData, setMetricData] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState<string | undefined>();

  useEffect(() => {
    getMetric(params, datasourceValue).then((res) => {
      setMetricData(res.data);
    });
  }, []);

  useEffect(() => {
    setSearchValue(value);
  }, [value]);

  return (
    <FormItem label='指标'>
      <AutoComplete
        style={{ width: '100%' }}
        options={_.map(metricData, (item) => {
          return {
            value: item,
          };
        })}
        value={searchValue}
        placeholder={'请选择指标'} //添加提示
        filterOption={(inputValue, option) => {
          if (option && option.value && typeof option.value === 'string') {
            return option.value.indexOf(inputValue) !== -1;
          }
          return true;
        }}
        onSearch={(val) => {
          setSearchValue(val);
        }}
        onBlur={(e: any) => {
          onChange(e.target.value);
        }}
        onSelect={(val) => {
          setSearchValue(val);
          onChange(val);
        }}
      />
    </FormItem>
  );
}
