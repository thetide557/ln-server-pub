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
import { useTranslation } from 'react-i18next';
import { Card, Form } from 'antd';
import { getBrainParams } from '@/services/warning';
import { panelBaseProps } from '../../constants';
import { Host, Metric } from './Rule';
import { getDefaultValuesByProd } from '../utils';
import ProdSelect from '../components/ProdSelect';
// @ts-ignore
import PlusAlertRule from 'plus:/parcels/AlertRule';

export default function Rule({ form, type, assets,field }) {
  const { t } = useTranslation('alertRules');
  // console.log('rule form', form);
  return (
    <Card {...panelBaseProps} className='rule-card' title={t('rule_configs')}>
      <ProdSelect
        field={field}
        onChange={(e) => {
          const val = e.target.value;
          if (val === 'anomaly') {
            // 获取默认 brain 参数，用于初始化智能告警的设置
            getBrainParams().then((res) => {
              // form.setFieldsValue(getDefaultValuesByProd(val, res));
              const strategies = form.getFieldValue("strategies") || [];
              const newStrategies = [...strategies];
              newStrategies[field.name] = {
                ...newStrategies[field.name],
                ...getDefaultValuesByProd(val, res),
              };
              form.setFieldsValue({
                strategies: newStrategies,
              });
            });
          } else {
            // form.setFieldsValue(getDefaultValuesByProd(val, {}));
            const strategies = form.getFieldValue("strategies") || [];
              const newStrategies = [...strategies];
              newStrategies[field.name] = {
                ...newStrategies[field.name],
                ...getDefaultValuesByProd(val, {}),
              };
              form.setFieldsValue({
                strategies: newStrategies,
              });
          }
        }}
      />
      {/* <Form.Item isListField={false} name={['rule_config', 'inhibit']} valuePropName='checked' noStyle hidden> */}
      <Form.Item isListField={false} {...field} name={[field.name, 'rule_config', 'inhibit']} valuePropName='checked' noStyle hidden>
        <div />
      </Form.Item>
      {/* <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.prod !== currentValues.prod}> */}
      <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues?.strategies[field.name]?.prod !== currentValues?.strategies[field.name]?.prod}>
        {() => {
          return <Metric form={form} type={type} assets={assets} field={field} />;
        }}
      </Form.Item>
    </Card>
  );
}
