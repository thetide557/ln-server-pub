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

import React ,{ useContext } from 'react';
import { CommonStateContext } from '@/App';
import { Form , Row, Col} from 'antd';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import IntervalAndDuration from '@/pages/alertRules/Form/components/IntervalAndDuration';
import AdvancedSettings from './AdvancedSettings';
import { AlertRule as ElasticsearchSettings } from '@/plugins/elasticsearch';
import DatasourceValueSelect from '@/pages/alertRules/Form/components/DatasourceValueSelect';
import DatasourceValueSelectV2 from '@/pages/alertRules/Form/components/DatasourceValueSelect/V2';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import { getDefaultValuesByCate } from '../../../utils';

// @ts-ignore
import PlusAlertRule from 'plus:/parcels/AlertRule';

export default function index({form}) {
  const { t } = useTranslation('alertRules');
  const cate = Form.useWatch('cate');
  const { groupedDatasourceList , reloadGroupedDatasourceList} = useContext(CommonStateContext);

  return (
    <div>
      <Form.Item name='datasource_value' hidden>
        <div />
      </Form.Item>
      {/* <Row> */}
        {/* <Col span={12}> */}
          <Form.Item label={t('common:datasource.type')} name='cate'>
            <DatasourceCateSelect
              scene='alert'
              filterCates={(cates) => {
                return _.filter(cates, (item) => _.includes(item.type, 'logging') && !!item.alertRule);
              }}
              onChange={(val) => {
                form.setFieldsValue(getDefaultValuesByCate('logging', val));
              }}
            />
          </Form.Item>
        {/* </Row> */}
        {/* </Col> */}
        {/* <Row  gutter={16}> */}
        {/* <Col span={12}> */}
          <Form.Item shouldUpdate={(prevValues, curValues) => prevValues.cate !== curValues.cate} noStyle>
            {({ getFieldValue, setFieldsValue }) => {
              const cate = getFieldValue('cate');
              return (
                // <DatasourceValueSelect
                //   setFieldsValue={setFieldsValue}
                //   cate={cate}
                //   datasourceList={groupedDatasourceList[cate] || []}
                //   mode={cate === 'prometheus' ? 'multiple' : undefined}
                // />
                <DatasourceValueSelectV2 datasourceList={groupedDatasourceList[cate] || []} reloadGroupedDatasourceList={reloadGroupedDatasourceList} showExtra />
              );
            }}
          </Form.Item>
        {/* </Col> */}
      {/* </Row> */}
      <div style={{ marginBottom: 10 }}>
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, curValues) => !_.isEqual(prevValues.cate, curValues.cate) || !_.isEqual(prevValues.datasource_value, curValues.datasource_value)}
        >
          {(form) => {
            const cate = form.getFieldValue('cate');
            const datasourceValue = form.getFieldValue('datasource_value');
            if (cate === 'elasticsearch') {
              return <ElasticsearchSettings disabled={false} form={form} datasourceValue={datasourceValue} />;
            }
            return <PlusAlertRule cate={cate} form={form} datasourceValue={datasourceValue} />;
          }}
        </Form.Item>
      </div>

      <IntervalAndDuration
        intervalTip={(num) => {
          return t('datasource:es.alert.prom_eval_interval_tip', { num });
        }}
        durationTip={(num) => {
          return t('datasource:es.alert.prom_for_duration_tip', { num });
        }}
      />
      {/* {cate !== 'loki' && <AdvancedSettings />} */}
    </div>
  );
}
