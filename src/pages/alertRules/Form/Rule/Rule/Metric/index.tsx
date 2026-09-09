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
// 第六步 第4段 W2（阶段 2）：新 8 种（mysql / pgsql / doris / opensearch / loki / victorialogs / tdengine / iotdb）
// 用夜莺 v9 的数据源筛选器 V2（发新字段 datasource_queries）；老类型仍用上面那个老选择器（发 datasource_ids）。
import DatasourceValueSelectV2 from '@/pages/alertRules/Form/components/DatasourceValueSelect/V2';
import { getDatasourceBriefList } from '@/services/common';
import IntervalAndDuration from '@/pages/alertRules/Form/components/IntervalAndDuration';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import { getDefaultValuesByCate, isLegacyCate, getDatasourceValueByQueries } from '../../../utils';
import Prometheus from './Prometheus';
import XhPrometheus from './Prometheus/XHindex';
// 第六步 第4段 W0（阶段 0 · ck 试点）：直达路径 import，不写 '@/plugins/clickHouse' 这种裸目录
//（裸目录的 index 会把 Explorer / ExplorerNG / Dashboard 整套一起拖进来；多数据源轮拍板-02）。
import ClickHouseAlertRule from '@/plugins/clickHouse/AlertRule';
// 第六步 第4段 W3a（阶段 1 收尾）：其余九种编辑器，同样走直达路径（大顾问 Q4 第 5.1 节）。
import MySQLAlertRule from '@/plugins/mysql/AlertRule';
import PgSQLAlertRule from '@/plugins/pgsql/AlertRule';
import DorisAlertRule from '@/plugins/doris/AlertRule';
import ElasticsearchAlertRule from '@/plugins/elasticsearch/AlertRule'; // opensearch 也用它（fe v9.1.0 Form/Rule/Rule/index.tsx:45）
import TDengineAlertRule from '@/plugins/TDengine/AlertRule';
import IotDBAlertRule from '@/plugins/iotdb/AlertRule';
import VictorialogsAlertRule from '@/plugins/victorialogs/AlertRule';
// loki 的编辑器是老表单自带的（fe v9.1.0 Form/Rule/Rule/index.tsx:22 也是从这里引），不在 src/plugins 下。
import LokiAlertRule from '../Log/Loki';
import { FormStateContext } from '@/pages/alertRules/Form';
// @ts-ignore
import PlusAlertRule from 'plus:/parcels/AlertRule';

export default function index({ form, type, assets ,field }) {
  const { t } = useTranslation('alertRules');
  // 第六步 第4段 W2：V2 有个「刷新数据源列表」的小按钮，fe 传的是 CommonStateContext.reloadGroupedDatasourceList，
  // pub 的 context 里没有这个方法（只有 setDatasourceList，src/App.tsx:147-156），
  // 所以按大顾问 Q3 第 3.3 节的建议，用 getDatasourceBriefList().then(setDatasourceList) 现包一个。
  const { groupedDatasourceList, setDatasourceList } = useContext(CommonStateContext);
  const reloadGroupedDatasourceList = () => {
    getDatasourceBriefList().then((res) => {
      setDatasourceList(res as any);
    });
  };
  // 第六步 第4段 W0：整张表单是不是只读，pub 放在 FormStateContext 里（Form/index.tsx:45-47 定义，
  // Metric/Prometheus/index.tsx:43 同样用法）。搬来的编辑器要靠它决定输入框禁不禁用。
  const { disabled } = useContext(FormStateContext);
  // if (form.getFieldValue('datasource_ids')?.length == 0) {
  //   form.setFieldsValue({datasource_ids: [0]});
  // }
  // ---- 第六步 第4段 W2（阶段 2）：这段「datasource_ids 空了就强设成 [0]（全部）」只对**老类型**做。
  // 新 8 种根本没有 datasource_ids（回填时删掉、提交时也不发），要是让它塞回一个 [0]，
  // 提交体里就会多出这个老字段，违反「新 8 种只发 datasource_queries」。
  // 条件必须用 isLegacyCate 而不是收窄成 cate === 'prometheus'：收窄了会让 ck / elasticsearch
  // 这些老类型的提交体从现在的 [0] 变成 []，那是改了存量行为（大顾问 Q3 第六节坑 4）。
  const forceAllCate = form.getFieldValue(["strategies", field.name, "cate"]);
  if (
    isLegacyCate(forceAllCate) &&
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
              // ---- 第六步 第4段 W2（阶段 2）：老类型这一支一个字没改（提交体要逐字节不变）；
              // 新 8 种换成 v9 的筛选器 V2，绑的是 datasource_queries。
              // names 给**相对**路径、absNames 给**绝对**路径：Form.List 会自动接上外层
              // <Form.List name="strategies"> 的前缀，而 useWatch / getFieldValue 不会
              //（rc-field-form/lib/List.js:40-43 与 lib/useWatch.js:53,69,78；拿不准-W2.md 第 2 条）。
              // datasourceCate 必须传：不传的话 V2 会去读**表单顶层**的 cate（V2.tsx:205），羚牛顶层没有这个字段。
              if (!isLegacyCate(cate)) {
                return (
                  <DatasourceValueSelectV2
                    names={[field.name, "datasource_queries"]}
                    absNames={["strategies", field.name, "datasource_queries"]}
                    datasourceList={groupedDatasourceList[cate] || []}
                    datasourceCate={cate}
                    reloadGroupedDatasourceList={reloadGroupedDatasourceList}
                    disabled={disabled}
                  />
                );
              }
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
            ) ||
            // 第六步 第4段 W2（阶段 2）：只加不删。新 8 种的数据源改在 datasource_queries 上，
            // 不比它的话，换了数据源下面的编辑器不会重新渲染（大顾问 Q3 第 3.3 节）。
            !_.isEqual(
              prevValues?.strategies[field.name]?.datasource_queries,
              curValues?.strategies[field.name]?.datasource_queries
            )
          }
        >
          {(form) => {
            // const cate = form.getFieldValue('cate');
            // const datasourceValue = form.getFieldValue('datasource_ids')
            const cate = form.getFieldValue(["strategies", field.name, "cate"]);
            // ---- 第六步 第4段 W2（阶段 2）：老类型照旧取 datasource_ids（数组，Prometheus 编辑器里再取第一个）；
            // 新 8 种没有 datasource_ids，按 datasource_queries 在本地算出命中的数据源、取第一个，
            // 语义与夜莺的 datasource_value 一致（fe:.../V2.tsx:206-217 那份是调后端接口拿的，羚牛没有那条接口）。
            const datasourceValue = isLegacyCate(cate)
              ? form.getFieldValue(["strategies", field.name, "datasource_ids"])
              : getDatasourceValueByQueries(
                  form.getFieldValue(["strategies", field.name, "datasource_queries"]),
                  groupedDatasourceList[cate] || []
                );
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
            // ---- 第六步 第4段 W3a（阶段 1 收尾）：十种 v9 编辑器类型的分发，放在 PlusAlertRule 兜底之前。----
            // 契约 = fe v9.1.0 老表单 Form/Rule/Rule/index.tsx:40-49 的 props + 阶段 0 定的规矩 B（key / field / cate / disabled）。
            // 依据：第六步-流水线/第4段/顾问答案/大顾问-Q4.md 第 5.2 节。
            //
            // 三件要留心的事：
            // 1) 只传 field —— 每个编辑器的 AlertRule/index.tsx 自己把它拼成相对路径 [field.name, 'rule_config']
            //    （给 Form.Item / Form.List 用）和绝对路径 ['strategies', field.name, 'rule_config']
            //    （给 getFieldValue / useWatch 用，这两个 API 不吃 Form.List 前缀）。
            // 2) key={field.key} 让编辑器随策略整体重新挂载：antd 的 useWatch 只在挂载时订阅一次
            //    （node_modules/rc-field-form/lib/useWatch.js:56-83 的 useEffect 依赖数组是空的），
            //    删掉前面的策略、后面策略下标前移时，不重挂就会短暂读到旧策略的值。key 不能放进 common 里 spread——
            //    React 17 对 spread 里带 key 会告警，所以每行单独写。
            // 3) datasourceValue 的形状：老类型是 datasource_ids 数组，新 8 种是上面本地算出来的单个 id（W2）；
            //    doris 和 loki 的 props 要求数组，所以给它们用 dsArr 兜住两种情况。
            //    fe 在 :44 / :45 / :48 写死的 disabled={false} 不照抄——羚牛一律用 FormStateContext 里的 disabled（阶段 0 ck 已如此）。
            const dsArr: number[] = _.isArray(datasourceValue) ? datasourceValue : [datasourceValue];
            const common = { field, cate, disabled };
            if (cate === "ck") return <ClickHouseAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />;
            if (cate === "mysql") return <MySQLAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />;
            if (cate === "pgsql") return <PgSQLAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />;
            if (cate === "tdengine") return <TDengineAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />;
            if (cate === "iotdb") return <IotDBAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />;
            if (cate === "elasticsearch") return <ElasticsearchAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />; // fe:44
            if (cate === "opensearch") return <ElasticsearchAlertRule key={field.key} {...common} datasourceValue={datasourceValue} hideIndexPattern />; // fe:45，复用 ES 编辑器、只是不显示索引模式
            if (cate === "doris") return <DorisAlertRule key={field.key} {...common} datasourceValue={dsArr} />; // fe:48 的 datasourceCate={cate} 可省：doris/AlertRule/index.tsx:63 会回落到 cate
            if (cate === "victorialogs") return <VictorialogsAlertRule key={field.key} {...common} datasourceValue={datasourceValue} />; // fe:49
            if (cate === "loki") return <LokiAlertRule key={field.key} {...common} datasourceCate={cate} datasourceValue={dsArr} />; // fe:43，IProps 里 datasourceCate / datasourceValue 都是必填
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
