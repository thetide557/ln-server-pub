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
// 第六步 第4段 W0（阶段 0 · ck 试点）：直达路径 import，不写 '@/plugins/clickHouse' 这种裸目录
//（裸目录的 index 会把 Explorer / ExplorerNG / Dashboard 整套一起拖进来；多数据源轮拍板-02）。
import ClickHouseAlertRule from '@/plugins/clickHouse/AlertRule';
import { FormStateContext } from '@/pages/alertRules/Form';
// @ts-ignore
import PlusAlertRule from 'plus:/parcels/AlertRule';

export default function index({ form, type, assets ,field }) {
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  // 第六步 第4段 W0：整张表单是不是只读，pub 放在 FormStateContext 里（Form/index.tsx:45-47 定义，
  // Metric/Prometheus/index.tsx:43 同样用法）。搬来的编辑器要靠它决定输入框禁不禁用。
  const { disabled } = useContext(FormStateContext);
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
                // 第六步 第4段 W0（阶段 0 · ck 试点）：原来这里写死只列指标型（_.includes(item.type, 'metric')）。
                // 现在按该策略自己的产品类型（prod）分流：选了「Log」就列日志型，其余（'metric' / 数字 1 / 没设）一律照旧列指标型。
                // 羚牛的多策略结构下 prod 在 ['strategies', field.name, 'prod']，不是顶层。
                const prod = form.getFieldValue([
                  "strategies",
                  field.name,
                  "prod",
                ]);
                const wantType = prod === "logging" ? "logging" : "metric";
                return _.filter(
                  cates,
                  (item) => _.includes(item.type, wantType) && !!item.alertRule
                );
              }}
              onChange={(val) => {
                // form.setFieldsValue(getDefaultValuesByCate('metric', val));
                const strategies = form.getFieldValue("strategies") || [];
                const newStrategies = [...strategies];
                // ---- 第六步 第4段 W0（lead 拍板-13，依据 顾问答案/大顾问-Q2.md 第三、五节）----
                // 原文这里写死传 "metric"，而 getDefaultValuesByCate 的第一个参数就是要写回 prod 的值；
                // 于是用户在产品类型里选了 Log（prod='logging'）之后，只要再动一下类型下拉，
                // prod 就被悄悄打回 'metric'。改成按该策略当前的 prod 传。
                const curProd = strategies[field.name]?.prod;
                newStrategies[field.name] = {
                  ...newStrategies[field.name],
                  ...getDefaultValuesByCate(
                    curProd === "logging" ? "logging" : "metric",
                    val
                  ),
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
            // 第六步 第4段 W0（阶段 0 · ck 试点）：在 PlusAlertRule 兜底之前加 ck 分支。
            // 只传 field —— ck 的 AlertRule/index.tsx 自己把它拼成
            // 相对路径 [field.name, 'rule_config']（给 Form.Item / Form.List 用）和
            // 绝对路径 ['strategies', field.name, 'rule_config']（给 getFieldValue / useWatch 用，这两个 API 不吃 Form.List 前缀）。
            // 其余 9 种类型阶段 1 一次性照这个样子挂上来。
            if (cate === "ck") {
              // key={field.key} 让编辑器随策略整体重新挂载：antd 的 useWatch 只在挂载时订阅一次
              //（node_modules/rc-field-form/lib/useWatch.js:56-83 的 useEffect 依赖数组是空的），
              // 删掉前面的策略、后面策略下标前移时，不重挂就会短暂读到旧策略的值。
              return (
                <ClickHouseAlertRule
                  key={field.key}
                  field={field}
                  cate={cate}
                  datasourceValue={datasourceValue}
                  disabled={disabled}
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
