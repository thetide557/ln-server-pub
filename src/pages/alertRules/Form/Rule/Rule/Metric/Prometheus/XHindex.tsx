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

import React, { useContext, useEffect, useState } from 'react';
import { Form, Row, Col, Card, Space, Input, Select, message, Radio } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { PromQLInputWithBuilder } from '@/components/PromQLInput';
import Severity from '@/pages/alertRules/Form/components/Severity';
import Inhibit from '@/pages/alertRules/Form/components/Inhibit';
import { FormStateContext } from '@/pages/alertRules/Form';
import './style.less';
import { getXhMonitorByAssetId } from '@/services/manage';

const DATASOURCE_ALL = 0;

function getFirstDatasourceId(datasourceIds: number[] = [], datasourceList: { id: number }[] = []) {
  return _.isEqual(datasourceIds, [DATASOURCE_ALL]) && datasourceList.length > 0 ? datasourceList[0]?.id : datasourceIds[0];
}

export default function index(props: { datasourceCate: string; datasourceValue: number[] }) {
  const { datasourceCate, datasourceValue } = props;
  const { t } = useTranslation('alertRules');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const { disabled } = useContext(FormStateContext);
  const curDatasourceList = groupedDatasourceList[datasourceCate] || [];
  const datasourceId = getFirstDatasourceId(datasourceValue, curDatasourceList);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [monitorInfos, setMonitorInfos] = useState<any>({});

  const selectAsset = (e) => {
    setMonitors([]);
    let assetId = window.localStorage.getItem('select_monitor_asset_id');
    if (assetId != null && assetId.length > 0) {
      getXhMonitorByAssetId(assetId).then(({ dat }) => {
        let item = new Array;
        dat.forEach(element => {
          monitorInfos[element.id] = element;
          item.push({
            value: element.id,
            label: element.monitoring_name
          })
        });
        setMonitors(item);
        setMonitorInfos({...monitorInfos})
      })

    }else{
      message.error("请选择要监控的资产信息")
    }

  }

  useEffect(() => {
    let assetId = window.localStorage.getItem('select_monitor_asset_id');
    if (assetId != null && assetId.length > 0) {
       selectAsset(null)
    }
  }, []);


  return (
    <>
    <Form.List name={['rule_config', 'queries']}>
      {(fields, { add, remove }) => (
        <Card
          title={
            <Space>
              <span>{t('metric.query.title')}</span>
              {/* <PlusCircleOutlined
                onClick={() => {
                  add()
                }

                }
              />
              <Inhibit triggersKey='queries' /> */}
            </Space>
          }
          size='small'
        >
          <div className='alert-rule-triggers-container'>
            <Row gutter={10} className='row_conditions'>
              {fields.map((field, index) => (
                <Col span={12}>
                  <div key={field.key} className='alert-rule-trigger-container'>
                    <Row gutter={10}>
                      <Col span={12}>
                        
                        <Form.Item  rules={[{ required:true, message: `请选择监控名称` }]}   {...field} name={[field.name, 'monitor_id']} label={"告警条件"}>
                          <Select placeholder="请选择监控名称" onDropdownVisibleChange={(e) => {
                            selectAsset(e);
                          }} options={monitors} />
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item rules={[{ required:true, message: `请选择关系` }]} {...field} name={[field.name, 'relation']} >
                          <Select options={[
                            { value: ">", label: '大于' }, { value: "==", label: '等于' }, { value: "<", label: '小于' },

                          ]}></Select>
                        </Form.Item>
                      </Col>
                      <Col span={6}>
                        <Form.Item {...field} rules={[{ required:true, message: `请输入有效值` }]} name={[field.name, 'value']} >
                          <Input placeholder="请输入值" />
                        </Form.Item>
                      </Col>
                    </Row>                    
                    {/* <div className='remove_zone_button'>
                      <MinusCircleOutlined className='alert-rule-trigger-remove special_remove_icon' onClick={() => remove(field.name)} />
                    </div> */}
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        </Card>
      )}
    </Form.List>
    <Row gutter={10}>
      <Col span={24}>
      <Space align='baseline'>
      触发告警级别：
      <Form.Item name={'severity'} className='severity_cls'    rules={[{ required: true, message: '选择级别' }]}>
        <Radio.Group disabled={disabled}>
          <Radio value={1}>{t('common:severity.1')}</Radio>
          <Radio value={2}>{t('common:severity.2')}</Radio>
          <Radio value={3}>{t('common:severity.3')}</Radio>
        </Radio.Group>
      </Form.Item>
    </Space>
      </Col>
    </Row>
    </>
  );
}
