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
import { Form, Radio, Select, Row, Col, Input } from 'antd';
import { CaretDownOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { Trans, useTranslation } from 'react-i18next';
import { Panel } from '../../Components/Collapse';
import { calcsOptions } from '../../config';
import { useGlobalState } from '@/pages/dashboard/globalState';

export default function GraphStyles() {
  const { t, i18n } = useTranslation('dashboard');
  const namePrefix = ['custom'];
  const [tableFields] = useGlobalState('tableFields');

  return (
    <Panel header={t('panel.custom.title')}>
      <>
        <Row gutter={10}>
          <Col span={12}>
            <Form.Item label={t('panel.custom.calc')} name={[...namePrefix, 'calc']}>
              <Select suffixIcon={<CaretDownOutlined />}>
                {_.map(calcsOptions, (item, key) => {
                  return (
                    <Select.Option key={key} value={key}>
                      {i18n.language === 'en_US' ? key : item.name}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label={t('panel.custom.timeseries.stack')} name={[...namePrefix, 'stack']}>
              <Radio.Group buttonStyle='solid'>
                <Radio.Button value='noraml'>{t('panel.custom.timeseries.stack_noraml')}</Radio.Button>
                <Radio.Button value='off'>{t('panel.custom.timeseries.stack_off')}</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label='分组字段' name={[...namePrefix, 'seriesField']}>
              <Select suffixIcon={<CaretDownOutlined />}>
                {_.map(tableFields, (item) => {
                  return (
                    <Select.Option key={item} value={item}>
                      {item}
                    </Select.Option>
                  );
                })}
              </Select>
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item label={t('panel.custom.pie.detailName')} name={[...namePrefix, 'detailName']}>
              <Input style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={15}>
            <Form.Item
              label={t('panel.custom.pie.detailUrl')}
              name={[...namePrefix, 'detailUrl']}
              tooltip={{
                overlayInnerStyle: { width: 330 },
                title: <Trans ns='dashboard' i18nKey='dashboard:link.url_tip' components={{ 1: <br /> }} />,
              }}
            >
              <Input style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </>
    </Panel>
  );
}
