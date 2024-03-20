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
import { Form, Radio, Slider, Space, Select } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Panel } from '../../Components/Collapse';

export default function GraphStyles() {
  const { t } = useTranslation('dashboard');
  const namePrefix = ['custom'];

  return (
    <Panel header={t('panel.custom.title')}>
      <>
        <Space>
          <Form.Item noStyle shouldUpdate={(prevValues, curValues) => _.get(prevValues, [...namePrefix, 'drawStyle']) !== _.get(curValues, [...namePrefix, 'drawStyle'])}>
            {({ getFieldValue }) => {
              const drawStyle = getFieldValue([...namePrefix, 'drawStyle']);
              if (drawStyle === 'lines' || drawStyle === 'bars') {
                return (
                  <>
                    {drawStyle === 'lines' ? (
                      <Form.Item label={t('panel.custom.timeseries.lineInterpolation')} name={[...namePrefix, 'lineInterpolation']}>
                        <Radio.Group buttonStyle='solid'>
                          <Radio.Button value='linear'>Linear</Radio.Button>
                          <Radio.Button value='smooth'>Smooth</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                    ) : null}
                  </>
                );
              }
              return null;
            }}
          </Form.Item>
          <Form.Item label={t('panel.custom.timeseries.spanNulls')} name={[...namePrefix, 'spanNulls']} initialValue={false}>
            <Radio.Group buttonStyle='solid'>
              <Radio.Button value={true}>{t('panel.custom.timeseries.spanNulls_1')}</Radio.Button>
              <Radio.Button value={false}>{t('panel.custom.timeseries.spanNulls_0')}</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Space>
        <Form.Item label={t('panel.custom.timeseries.fillOpacity')} name={[...namePrefix, 'fillOpacity']}>
          <Slider min={0} max={1} step={0.01} />
        </Form.Item>
        <Space>
          <Form.Item label={t('panel.custom.timeseries.stack')} name={[...namePrefix, 'stack']}>
            <Radio.Group buttonStyle='solid'>
              <Radio.Button value='noraml'>{t('panel.custom.timeseries.stack_noraml')}</Radio.Button>
              <Radio.Button value='off'>{t('panel.custom.timeseries.stack_off')}</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Space>
      </>
    </Panel>
  );
}
