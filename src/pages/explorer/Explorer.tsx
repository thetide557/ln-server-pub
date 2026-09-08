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
/**
 * querystring
 * data_source_name: string
 * data_source_id: string
 */
import React, { useRef, useContext } from 'react';
import { Card, Space, Input, Form, Select } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { useLocation, useHistory } from 'react-router-dom';
import InputGroupWithFormItem from '@/components/InputGroupWithFormItem';
import EmptyDatasourcePopover from '@/components/DatasourceSelect/EmptyDatasourcePopover';
import { DatasourceCateEnum } from '@/utils/constant';
import { getDefaultDatasourceValue, setDefaultDatasourceValue } from '@/utils';
import { CommonStateContext } from '@/App';
import { DatasourceCateSelect } from '@/components/DatasourceSelect';
import Prometheus from './Prometheus';
import Elasticsearch from './Elasticsearch';
// @ts-ignore
import PlusExplorer from 'plus:/parcels/Explorer';
// ---- 第六步 L2（多数据源）：只在 import 块末尾追加四行直达 import（不 import `@/plugins/<t>` 裸目录，
// 那会把该类型的告警规则 / 仪表盘 / Event 整套都拖进包里，见拍板-02）。
// 对应 fe v9.1.0 src/pages/explorer/Explorer.tsx:34-36（IotDB / TDengine / CK）与 :43（Loki）。
import IotDB from '@/plugins/iotdb/Explorer';
import TDengine from '@/plugins/TDengine/Explorer';
import CK from '@/plugins/clickHouse/Explorer';
import Loki from '@/pages/explorer/Loki';
import './index.less';

type Type = 'logging' | 'metric';

interface IProps {
  type: Type;
  defaultCate: string;
}

const Panel = ({ type, defaultCate }: IProps) => {
  const { t } = useTranslation('explorer');
  const { groupedDatasourceList } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const history = useHistory();
  const headerExtraRef = useRef<HTMLDivElement>(null);
  const params = new URLSearchParams(useLocation().search);
  const datasourceCate = params.get('data_source_name') || localStorage.getItem(`explorer_datasource_cate_${type}`) || defaultCate;
  const datasourceValue = params.get('data_source_id') ? _.toNumber(params.get('data_source_id')) : getDefaultDatasourceValue(datasourceCate, groupedDatasourceList);

  return (
    <div className='explorer-container'>
      <Card bodyStyle={{ padding: 16 }}>
        <Form
          form={form}
          initialValues={{
            datasourceCate: datasourceCate,
            datasourceValue: datasourceValue,
          }}
        >
          <div className='explorer-content'>
            <Space align='start'>
              <InputGroupWithFormItem label={t('common:datasource.type')}>
                <Form.Item name='datasourceCate' noStyle>
                  <DatasourceCateSelect
                    scene='graph'
                    filterCates={(cates) => {
                      return _.filter(cates, (item) => _.includes(item.type, type));
                    }}
                    dropdownMatchSelectWidth={false}
                    style={{ minWidth: 70 }}
                    onChange={(val) => {
                      form.setFieldsValue({
                        datasourceValue: getDefaultDatasourceValue(val, groupedDatasourceList),
                        query: undefined,
                      });
                      history.replace({
                        search: `?data_source_name=${val}&data_source_id=${getDefaultDatasourceValue(val, groupedDatasourceList)}`,
                      });
                    }}
                  />
                </Form.Item>
              </InputGroupWithFormItem>
              <Form.Item shouldUpdate={(prev, curr) => prev.datasourceCate !== curr.datasourceCate} noStyle>
                {({ getFieldValue }) => {
                  const cate = getFieldValue('datasourceCate');
                  return (
                    <EmptyDatasourcePopover datasourceList={groupedDatasourceList[cate]}>
                      <Input.Group compact>
                        <span
                          className='ant-input-group-addon'
                          style={{
                            width: 'max-content',
                            height: 32,
                            lineHeight: '32px',
                          }}
                        >
                          {t('common:datasource.id')}
                        </span>

                        <Form.Item
                          name='datasourceValue'
                          rules={[
                            {
                              required: true,
                              message: t('common:datasource.id_required'),
                            },
                          ]}
                        >
                          <Select
                            style={{ minWidth: 70 }}
                            dropdownMatchSelectWidth={false}
                            onChange={(val: string) => {
                              setDefaultDatasourceValue(cate, val);
                              history.replace({
                                search: `?data_source_name=${cate}&data_source_id=${val}`,
                              });
                              if (cate !== 'prometheus') {
                                form.setFieldsValue({
                                  query: undefined,
                                });
                              }
                            }}
                            showSearch
                            optionFilterProp='children'
                          >
                            {_.map(groupedDatasourceList[cate], (item) => (
                              <Select.Option value={item.id} key={item.id}>
                                {item.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Input.Group>
                    </EmptyDatasourcePopover>
                  );
                }}
              </Form.Item>
              <div ref={headerExtraRef} />
            </Space>
            <div style={{ minHeight: 0, height: '100%' }}>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldValue }) => {
                  const datasourceCate = getFieldValue('datasourceCate');
                  const datasourceValue = getFieldValue('datasourceValue');
                  if (datasourceCate === DatasourceCateEnum.elasticsearch) {
                    return <Elasticsearch key={datasourceValue} headerExtra={headerExtraRef.current} datasourceValue={datasourceValue} form={form} />;
                  } else if (datasourceCate === DatasourceCateEnum.prometheus) {
                    return <Prometheus key={datasourceCate} headerExtra={headerExtraRef.current} datasourceValue={datasourceValue} form={form} />;
                  } else if (datasourceCate === DatasourceCateEnum.iotdb) {
                    // ---- 第六步 L2（多数据源）：以下四个分支照抄 fe v9.1.0 src/pages/explorer/Explorer.tsx:383-392，
                    // 只在 prometheus 分支之后、PlusExplorer 兜底之前追加，pub 原有的两个分支一个字没动。
                    // fe 还给 Elasticsearch / Loki 传了 defaultFormValuesControl（视图收藏用），pub 没有这套东西，
                    // 而它在 fe 的 Loki 里本来就是可选参数（fe src/pages/explorer/Loki/index.tsx:30-35，:119 有空值保护），所以不传。
                    return <IotDB datasourceValue={datasourceValue} form={form} />;
                  } else if (datasourceCate === DatasourceCateEnum.tdengine) {
                    return <TDengine datasourceValue={datasourceValue} form={form} />;
                  } else if (datasourceCate === DatasourceCateEnum.loki) {
                    return <Loki datasourceValue={datasourceValue} headerExtra={headerExtraRef.current} form={form} />;
                  } else if (datasourceCate === DatasourceCateEnum.ck) {
                    return <CK datasourceValue={datasourceValue} headerExtra={headerExtraRef.current} />;
                  }
                  return <PlusExplorer key={datasourceValue} datasourceCate={datasourceCate} datasourceValue={datasourceValue} headerExtraRef={headerExtraRef} form={form} />;
                }}
              </Form.Item>
            </div>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Panel;
