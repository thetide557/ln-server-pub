import React, { useState, useEffect } from 'react';
import { AutoComplete } from 'antd';
import _ from 'lodash';
import { getMetric } from '@/services/dashboardV2';
import FormItem from '../components/FormItem';
import {cn_name,en_name} from "../components/metrics_translation"

interface IProps {
  datasourceValue: number;
  params: {
    start: number;
    end: number;
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
    <FormItem
      label='指标'
      style={{
        width: 'calc(50% - 4px)',
      }}
    >
      <AutoComplete
        style={{ width: '100%' }}
        showSearch
        options={_.map(metricData, (item) => { 
          let label :any = item;;
          if (cn_name[item]) {
            label =<div>
                <div>{item}</div>
                <div style={{ color: '#8c8c8c' }}>{cn_name[item]}</div>
            </div> ;
          } else if (en_name[item]) {
            label =item+" "+en_name[item];
            label =<div>
                <div>{item}</div>
                <div style={{ color: '#8c8c8c' }}>{en_name[item]}</div>
            </div> ;
          }
          return {
            value:item,
            label:label,
          };
        })}
        value={searchValue}
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
          onChange(val);
        }}
      />
    </FormItem>
  );
}
