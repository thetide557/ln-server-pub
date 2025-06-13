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

import React, { useContext } from 'react';
import { Form, Row, Col } from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import IntervalAndDuration from '@/pages/alertRules/Form/components/IntervalAndDuration';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import { getDefaultValuesByCate } from '../../../utils';
import Prometheus from './Prometheus';
import XhPrometheus from './Prometheus/XHindex';
// @ts-ignore
import PlusAlertRule from 'plus:/parcels/AlertRule';

export default function index({ form, type, assets ,field }) {
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  // if (form.getFieldValue('datasource_ids')?.length == 0) {
  //   form.setFieldsValue({datasource_ids: [0]});
  // }
  if (
    form.getFieldValue(["strategies", field.name, "datasource_ids"])?.length ==
    0
  ) {
    const strategies = form.getFieldValue("strategies") || [];
    const newStrategies = [...strategies];
    newStrategies[field.name] = {
      ...newStrategies[field.name],
      datasource_ids: [0],
    };
    form.setFieldsValue({
      strategies: newStrategies,
    });
  }
  
  return (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          {/* <Form.Item label={t('common:datasource.type')} name='cate'> */}
          <Form.Item
            label={t("common:datasource.type")}
            {...field}
            name={[field.name, "cate"]}
          >
            <DatasourceCateSelect
              scene="alert"
              filterCates={(cates) => {
                return _.filter(
                  cates,
                  (item) => _.includes(item.type, "metric") && !!item.alertRule
                );
              }}
              onChange={(val) => {
                // form.setFieldsValue(getDefaultValuesByCate('metric', val));
                const strategies = form.getFieldValue("strategies") || [];
                const newStrategies = [...strategies];
                newStrategies[field.name] = {
                  ...newStrategies[field.name],
                  ...getDefaultValuesByCate("metric", val),
                };
                form.setFieldsValue({
                  strategies: newStrategies,
                });
              }}
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          {/* <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle> */}
          <Form.Item
            shouldUpdate={(prevValues, curValues) =>
              prevValues?.strategies[field.name]?.cate !==
              curValues?.strategies[field.name]?.cate
            }
            noStyle
          >
            {({ getFieldValue, setFieldsValue }) => {
              // const cate = getFieldValue('cate');
              const cate = getFieldValue(["strategies", field.name, "cate"]);
              return (
                <DatasourceValueSelect
                  setFieldsValue={setFieldsValue}
                  getFieldValue={getFieldValue}
                  cate={cate}
                  datasourceList={groupedDatasourceList[cate] || []}
                  mode={cate === "prometheus" ? "multiple" : undefined}
                  field={field}
                />
              );
            }}
          </Form.Item>
        </Col>
      </Row>
      <div style={{ marginBottom: 10 }}>
        {/* <Form.Item noStyle shouldUpdate={(prevValues, curValues) => !_.isEqual(prevValues.cate, curValues.cate) || !_.isEqual(prevValues.datasource_ids, curValues.datasource_ids)}> */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, curValues) =>
            !_.isEqual(
              prevValues?.strategies[field.name]?.cate,
              curValues?.strategies[field.name]?.cate
            ) ||
            !_.isEqual(
              prevValues.strategies[field.name].datasource_ids,
              curValues.strategies[field.name].datasource_ids
            )
          }
        >
          {(form) => {
            // const cate = form.getFieldValue('cate');
            // const datasourceValue = form.getFieldValue('datasource_ids')
            const cate = form.getFieldValue(["strategies", field.name, "cate"]);
            const datasourceValue = form.getFieldValue([
              "strategies",
              field.name,
              "datasource_ids",
            ]);
            if (cate === "prometheus" && type == 0) {
              return (
                <Prometheus
                  datasourceCate={cate}
                  datasourceValue={datasourceValue}
                  {...assets}
                  field={field}
                />
              );
            }
            if (cate === "prometheus" && type === 1) {
              return (
                <XhPrometheus
                  datasourceCate={cate}
                  datasourceValue={datasourceValue}
                />
              );
            }
            return (
              <PlusAlertRule
                cate={cate}
                form={form}
                datasourceValue={datasourceValue}
              />
            );
          }}
        </Form.Item>
      </div>

      <IntervalAndDuration
        intervalTip={(num) => {
          return t("datasource:es.alert.prom_eval_interval_tip", { num });
        }}
        durationTip={(num) => {
          return t("datasource:es.alert.prom_for_duration_tip", { num });
        }}
        field={field}
      />
    </div>
  );
}
