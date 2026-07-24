import React, { useEffect } from 'react';
import { Select, Input, Button, Space } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useDynamicList } from 'ahooks';
import FormItem from '../components/FormItem';
import LabelNameSelect from './LabelNameSelect';
import LabelValueSelect from './LabelValueSelect';
import { PromVisualQueryLabelFilter } from '../types';

interface IProps {
  datasourceValue: number;
  metric?: string;
  params: {
    start: number;
    end: number;
  };
  value: PromVisualQueryLabelFilter[];
  onChange: (val: PromVisualQueryLabelFilter[]) => void;
}

export default function index(props: IProps) {
  const { datasourceValue, metric, params, value, onChange } = props;
  const { list, remove, getKey, insert, replace } = useDynamicList(
    value || [
      {
        label: '',
        value: '',
        op: '=',
      },
    ],
  );

  useEffect(() => {
    onChange(list);
  }, [list]);

  return (
    <>
    <div className='prom-query-builder-labels-container-wrapper'>
      <FormItem
        label={
          <Space>
            标签过滤
            {/* <PlusCircleOutlined
              onClick={() => {
                insert(list.length, {
                  label: '',
                  value: '',
                  op: '=',
                });
              }}
            /> */}
          </Space>
        }
        // style={{ width: list.length > 1 ? '100%' : 'calc(50% - 4px)' }}
        style={{
          width:'100%',
        }}
      >
        <div className='prom-query-builder-labels-container'>
          {_.map(list, (item, index) => {
            return (
              <Input.Group
                compact
                key={getKey(index)}
                // style={{
                //   width: list.length > 1 ? 'calc(50% - 4px)' : '100%',
                // }}
              >
                <LabelNameSelect
                  style={{ width: '25%' }}
                  metric={metric}
                  labels={list}
                  datasourceValue={datasourceValue}
                  params={params}
                  value={item.label}
                  onChange={(val) => {
                    replace(index, {
                      ...item,
                      label: val,
                    });
                  }}
                />
                <Select
                  style={{ width: 100 }}
                  value={item.op}
                  onChange={(val) => {
                    replace(index, {
                      ...item,
                      op: val,
                    });
                  }}
                >
                  <Select.Option value='='>=（等于）</Select.Option>
                  <Select.Option value='!='>!=（不等于）</Select.Option>
                  <Select.Option value='=~'>=~（属于）</Select.Option>
                  <Select.Option value='!~'>!~（不属于）</Select.Option>
                </Select>
                <LabelValueSelect
                  label={item.label}
                  datasourceValue={datasourceValue}
                  params={params}
                  style={{
                    width: `calc(100% - 35% - 60px - 70px)`,
                  }}
                  value={item.value}
                  onChange={(val) => {
                    replace(index, {
                      ...item,
                      value: val,
                    });
                  }}
                />
                <Button
                  className='label-filter-delete-btn'
                  onClick={() => {
                    remove(index);
                  }}
                >
                  <img src='/image/monitor-alert-center/del-btn.png' alt='删除' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Button>
              </Input.Group>
            );
          })}
          <Button
            className='label-filter-add-btn'
            icon={<PlusOutlined />}
            onClick={() => {
              insert(list.length, {
                label: '',
                value: '',
                op: '=',
              });
            }}
          >
            添加
          </Button>
      </div>
      </FormItem>
    </div>
    </>
  );
}
