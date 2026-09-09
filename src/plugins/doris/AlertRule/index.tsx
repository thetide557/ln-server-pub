/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React, { useState, useContext, useEffect } from 'react';
import { Form, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';

import { generateQueryNameByIndex } from '@/components/QueryName/utils';
import { CommonStateContext } from '@/App';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import Triggers from '@/pages/alertRules/FormNG/components/Triggers';

import { getDorisDatabases } from '../services';
import { NAME_SPACE } from '../constants';
import FormItemLabel from '@/pages/alertRules/FormNG/components/FormItemLabel';
import Query from './Query';

const DATASOURCE_ALL = 0;

function getFirstDatasourceId(datasourceIds: number[] = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0 ? datasourceList[0]?.id : datasourceIds?.[0];
}

// 第六步 第4段 W1-SQL组：把这个编辑器接进羚牛的多策略告警表单（做法与阶段 0 的 ck 样板一致）。
// 羚牛一条告警规则最多 5 个策略，外面套了一层 `<Form.List name="strategies">`
//（src/pages/alertRules/Form/index.tsx:198），每个策略自己一份 rule_config；
// 夜莺 fe 的表单是平铺的，所以原文里字段路径写死 ['rule_config', ...]。
//
// 两条规矩（出处：第六步-流水线/第4段/顾问问答-大顾问.md Q1 第二节）：
//   规矩 A · Form.Item / Form.List 的 name= 用**相对**路径；
//            Form.useWatch / getFieldValue / setFields 用**绝对**路径。
//   规矩 B · 顶层编辑器多收三个 prop：field（策略级 Form.List 的 field）、cate、disabled，
//            并在函数体开头派生出 prefixField / prefixName / fullPrefixName / absPrefix；
//            都不传时退回 fe 原状，组件在 fe 里原样能跑。
interface IProps {
  // 第六步 第4段 W1-SQL组：fe 老表单传的是 datasourceCate（Form/Rule/Rule/index.tsx:47），
  // 羚牛的分发处按规矩 B 统一传 cate，所以这里改成可选、缺省回落到 cate，两边都能用。
  datasourceCate?: string;
  datasourceValue: number[];
  disabled?: boolean;
  field?: any; // 羚牛策略级 Form.List 给的 field（含 name / key / fieldKey）；不传 = fe 原状
  cate?: string; // 数据源类型。fe 里是表单顶层字段，羚牛在每条策略上，所以改成由分发处传进来
}

export default function index(props: IProps) {
  const { datasourceValue, disabled, field, cate } = props;
  const datasourceCate = props.datasourceCate ?? cate ?? '';
  const prefixField = field ? _.omit(field, 'key') : {}; // 给 Form.List / Form.Item 展开用（key 在分发处显式写）
  const prefixName: (string | number)[] = field ? [field.name, 'rule_config'] : ['rule_config']; // 相对路径
  const fullPrefixName: (string | number)[] = field ? ['strategies'] : []; // 绝对路径的前半段
  const absPrefix = [...fullPrefixName, ...prefixName]; // 绝对路径 = ['strategies', n, 'rule_config']
  const { t } = useTranslation(NAME_SPACE);
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const curDatasourceList = groupedDatasourceList[datasourceCate] || [];
  const datasourceId = getFirstDatasourceId(datasourceValue, curDatasourceList);
  const [dbList, setDbList] = useState<string[]>([]);

  useEffect(() => {
    if (!datasourceId) return;
    getDorisDatabases({ datasource_id: datasourceId, cate: datasourceCate }).then((res) => {
      setDbList(res);
    });
  }, [datasourceId, datasourceId]);

  return (
    <>
      <div className='mb-4'>
        {/* 第六步 第4段 W1-SQL组（规矩 A）：fe 原文这里 name= 写死了顶层 ['rule_config','queries']，
            改成展开 prefixField + 相对路径；不传 field 时拼出来还是 ['rule_config','queries']，fe 行为不变。 */}
        <Form.List {...prefixField} name={[...prefixName, 'queries']}>
          {(fields, { add, remove }) => (
            <div>
              <FormItemLabel>
                <Space>
                  {t('datasource:query.title')}
                  {/* 第六步 第4段 W1-SQL组：Inhibit 内部是 getFieldValue / setFields（绝对路径），
                      在多策略表单里读顶层 rule_config 永远取不到值、开关从不显示。
                      W0 已按 lead 拍板-11 ① 给它加了可选 prefixName（缺省 ['rule_config'] = 原行为），这里把绝对前缀传进去。 */}
                  <Inhibit triggersKey='queries' prefixName={absPrefix} />
                </Space>
              </FormItemLabel>
              {fields.map((field) => (
                <Query
                  key={field.key}
                  datasourceId={datasourceId}
                  field={field}
                  dbList={dbList}
                  disabled={disabled}
                  // 第六步 第4段 W1-SQL组：Query.tsx 里 14 处是绝对路径调用（useWatch / setFields / getFieldValue），
                  // 把 rule_config 的绝对路径整段传下去（含义 = absPrefix），它内部只做 [...fullPrefixName, 'queries', ...]。
                  fullPrefixName={absPrefix}
                  cate={datasourceCate}
                  onClose={fields.length > 1 ? () => remove(field.name) : undefined}
                />
              ))}
              <Button
                className='w-full'
                type='dashed'
                onClick={() =>
                  add({
                    prom_ql: '',
                    severity: 3,
                    ref: generateQueryNameByIndex(fields.length),
                  })
                }
                icon={<PlusOutlined />}
              >
                {t('datasource:query.title')}
              </Button>
            </div>
          )}
        </Form.List>
      </div>
      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const queries = getFieldValue([...absPrefix, 'queries']);
          return <Triggers prefixField={prefixField} fullPrefixName={fullPrefixName} prefixName={prefixName} cate={cate} disabled={disabled} queries={queries} />;
        }}
      </Form.Item>
    </>
  );
}
