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

import React from 'react';
import { Form, Row, Col, Card, Space, Input } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { IS_PLUS } from '@/utils/constant';
import Severity from '@/pages/alertRules/Form/components/Severity';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import AdvancedSettings from '@/pages/alertRules/Form/Rule/Rule/Metric/Prometheus/components/AdvancedSettings';

// 第六步 第4段 W1-日志组（阶段 1 · loki）：把这个从 fe v9.1.0 搬来的 loki 编辑器接进羚牛的多策略告警表单。
// 羚牛一条告警规则最多 5 个策略，外面套了一层 `<Form.List name="strategies">`
//（src/pages/alertRules/Form/index.tsx:198），每个策略自己一份 rule_config；
// 夜莺 fe 的表单是平铺的，所以原文里字段路径写死 ['rule_config', 'queries']。
//
// 改法与阶段 0 的 ck 样板（src/plugins/clickHouse/AlertRule/index.tsx）同一模式，两条规矩见
// 第六步-流水线/第4段/顾问问答-大顾问.md Q1 第二节：
//   规矩 A · Form.Item / Form.List 的 name= 用**相对**路径；useWatch / getFieldValue / setFields 用**绝对**路径。
//   规矩 B · 顶层编辑器多收 field / cate / disabled 三个 prop，函数体开头派生四个前缀变量；
//            都不传时退回 fe 原状（相对前缀只剩 rule_config 一段、绝对前缀为空），组件在 fe 里原样能跑。
// 本文件的绝对路径调用只有一处：传给 Inhibit 的 prefixName（见下面 Inhibit 那一行）。
interface IProps {
  datasourceCate: string;
  datasourceValue: number[];
  field?: any; // 羚牛策略级 Form.List 给的 field（含 name / key / fieldKey）；不传 = fe 原状
  cate?: string; // 数据源类型。本文件自己用不到，收下来只为让分发处对十种类型写法一致（和 ck 样板同一套 props）
  disabled?: boolean;
}

export default function index(props: IProps) {
  const { t } = useTranslation('alertRules');
  // 外层策略的 field 叫 outerField，免得和下面 fields.map((field) => ...) 里那个「单条查询」的 field 撞名。
  // 命名同 pub 已有先例：src/pages/alertRules/Form/Rule/Rule/Metric/Prometheus/index.tsx 的 outerField。
  // 只解构本文件真正用到的 field；datasourceCate / datasourceValue / cate / disabled 都用不到——
  // 前三个在 fe 原文里就是「声明了不用」，disabled 则由 antd 的表单级开关兜住：
  // pub 在 src/pages/alertRules/Form/index.tsx:184 写的是 <Form ... disabled={disabled}>，
  // antd 4.21.0 会把它顺着 context 发给表单里所有控件（node_modules/antd/lib/form/Form.d.ts:22），
  // 所以这里的 Input / Severity 不用再各传一遍。留在 IProps 里只为分发处对十种类型写法一致。
  const { field: outerField } = props;
  const prefixField = outerField ? _.omit(outerField, 'key') : {}; // 给 Form.List 展开用（key 在分发处显式写）
  const prefixName: (string | number)[] = outerField ? [outerField.name, 'rule_config'] : ['rule_config']; // 相对路径
  const fullPrefixName: (string | number)[] = outerField ? ['strategies'] : []; // 绝对路径的前半段
  const absPrefix = [...fullPrefixName, ...prefixName]; // 绝对路径 = ['strategies', n, 'rule_config']

  return (
    <Form.List {...prefixField} name={[...prefixName, 'queries']}>
      {(fields, { add, remove }) => (
        <Card
          title={
            <Space>
              <span>{t('metric.query.title')}</span>
              <PlusCircleOutlined
                onClick={() =>
                  add({
                    prom_ql: '',
                    severity: 2,
                  })
                }
              />
              <Inhibit triggersKey='queries' prefixName={absPrefix} />
            </Space>
          }
          size='small'
        >
          <div className='alert-rule-triggers-container'>
            {fields.map((field) => (
              <div key={field.key} className='alert-rule-trigger-container'>
                <Row>
                  <Col flex='80px'>
                    <div style={{ marginTop: 6 }}>LogQL</div>
                  </Col>
                  <Col flex='auto'>
                    <Form.Item
                      {...field}
                      name={[field.name, 'prom_ql']} //页面上展示LogQL，实际还是存prom_ql
                      validateTrigger={['onBlur']}
                      trigger='onChange'
                      rules={[{ required: true, message: t('loki.required') }]}
                    >
                      <Input placeholder='Input logql to query. Press Shift+Enter for newlines'></Input>
                    </Form.Item>
                  </Col>
                </Row>
                <div className='mb-4'>
                  <Severity field={field} />
                </div>
                {IS_PLUS && <AdvancedSettings field={field} />}
                <MinusCircleOutlined className='alert-rule-trigger-remove' onClick={() => remove(field.name)} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </Form.List>
  );
}
