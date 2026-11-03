import React, { useState, useEffect } from 'react';
import { Form, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { getIndices } from '@/pages/explorer/Elasticsearch/services';
import { generateQueryName } from '@/components/QueryName';
import FormItemLabel from '@/pages/alertRules/FormNG/components/FormItemLabel';
import Query from './Query';

interface IProps {
  hideIndexPattern?: boolean;
  datasourceValue: number;
  // 第六步 第4段 W1：数据源 id 列表，只给 GraphPreview 的「换数据源」下拉框用；
  // fe 那里是读表单顶层的 datasource_values 字段，羚牛没有这个字段，所以改成一路传下来
  datasourceValues?: number[];
  form: any;
  disabled?: boolean;
  // 第六步 第4段 W1（规矩 A/B，出处 第4段/顾问问答-大顾问.md Q1 第二、三节）：
  prefixField?: any; // 羚牛策略级 Form.List 的 field（去掉 key），展开到 Form.List / Form.Item 上
  fullPrefixName?: (string | number)[]; // 绝对路径的前半段（羚牛是 ['strategies']；fe 是 []）
  prefixName?: (string | number)[]; // 相对路径（羚牛是 [n, 'rule_config']；fe 是 ['rule_config']）
  cate?: string; // 数据源类型；fe 在表单顶层读，羚牛在每条策略上，改成传进来
}

export default function index(props: IProps) {
  const { t } = useTranslation('alertRules');
  const { hideIndexPattern, datasourceValue, datasourceValues, form, disabled, prefixField = {}, fullPrefixName = [], prefixName = ['rule_config'], cate } = props;
  const [indexOptions, setIndexOptions] = useState<any[]>([]);
  // 第六步 第4段 W1：fe 原文 :22 只有一个 `const names = ['rule_config', 'queries']`，
  // 却同时喂给了 :41 的 `<Form.List name={names}>`（相对路径）和 :23 的 `Form.useWatch(names)`（绝对路径）。
  // 按规矩 A 必须拆成两个：names 给 name= 用，absNames 给 useWatch 用。
  // 两个 prop 都不传时 names = ['rule_config','queries']、absNames 也是它，fe 行为一字不变。
  const names = [...prefixName, 'queries']; // 相对路径
  const absNames = [...fullPrefixName, ...prefixName, 'queries']; // 绝对路径
  const queries = Form.useWatch(absNames);

  useEffect(() => {
    if (datasourceValue !== undefined) {
      getIndices(datasourceValue).then((res) => {
        setIndexOptions(
          _.map(res, (item) => {
            return {
              value: item,
            };
          }),
        );
      });
    }
  }, [datasourceValue]);

  return (
    <Form.List
      {...prefixField}
      name={names}
      initialValue={[
        {
          ref: 'A',
        },
      ]}
    >
      {(fields, { add, remove }) => (
        <div>
          <FormItemLabel>{t('datasource:es.alert.query.title')}</FormItemLabel>
          {fields.map((field) => {
            return (
              <Query
                key={field.key}
                field={field}
                hideIndexPattern={hideIndexPattern}
                datasourceValue={datasourceValue}
                datasourceValues={datasourceValues}
                indexOptions={indexOptions}
                disabled={disabled}
                fullPrefixName={fullPrefixName}
                prefixName={prefixName}
                cate={cate}
                onClose={fields.length > 1 ? () => remove(field.name) : undefined}
              />
            );
          })}
          <Button
            className='w-full'
            type='dashed'
            disabled={disabled}
            onClick={() =>
              add({
                ref: generateQueryName(_.map(queries, 'ref')),
                interval_unit: 'min',
                interval: 5,
                date_field: '@timestamp',
                value: {
                  func: 'count',
                },
              })
            }
            icon={<PlusOutlined />}
          >
            {t('datasource:es.alert.query.title')}
          </Button>
        </div>
      )}
    </Form.List>
  );
}
