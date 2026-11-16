// 2026-10-05 N16 摞二：复制自 fe v9.1.0 同路径（羚牛原无 Dashboard/；接线照 ck / doris）。
import React, { useContext } from 'react';
import { Form, Row, Col, Space, Select } from 'antd';
import { DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import _ from 'lodash';
import moment from 'moment';
import { useTranslation } from 'react-i18next';

import TimeRangePicker, { isMathString } from '@/components/TimeRangePicker';
import Collapse, { Panel } from '@/pages/dashboard/Editor/Components/Collapse';
import { CommonStateContext } from '@/App';
import LogQL from '@/components/LogQL';
import { DatasourceCateEnum } from '@/utils/constant';
import { generateQueryNameByIndex } from '@/components/QueryName/utils';
import ExpressionPanel from '@/pages/dashboard/Editor/Components/ExpressionPanel';
import AddQueryButtons from '@/pages/dashboard/Editor/Components/AddQueryButtons';

import AdvancedSettings from '../components/AdvancedSettings';
import DocumentDrawer from '../components/DocumentDrawer';
import LegendInput from '../components/LegendInput';
import { NAME_SPACE } from '../constants';
import './style.less';

export default function MySQLQueryBuilder({ datasourceValue }) {
  const { t } = useTranslation(NAME_SPACE);
  const chartForm = Form.useFormInstance();
  const type = Form.useWatch('type');
  const targets = Form.useWatch('targets');
  const { darkMode } = useContext(CommonStateContext) as any; // 2026-10-05 N16：照 ck QueryBuilder（L3 shim）——pub 的 ICommonState 没有 darkMode（App.tsx 不改），恒为 undefined = 浅色。

  if (!type) return null;

  return (
    <Form.List name='targets'>
      {(fields, { add, remove }, { errors }) => {
        return (
          <>
            <Collapse>
              {_.map(fields, (field, index) => {
                const prefixName = ['targets', field.name];
                const mode = _.get(targets, [field.name, 'query', 'mode']);
                const { __mode__ } = targets?.[field.name] || {};
                if (__mode__ === '__expr__') {
                  return <ExpressionPanel key={field.key} fields={fields} remove={remove} field={field} />;
                }
                return (
                  <Panel
                    header={
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          return getFieldValue([...prefixName, 'refId']) || generateQueryNameByIndex(index);
                        }}
                      </Form.Item>
                    }
                    key={field.key}
                    extra={
                      <div>
                        {fields.length > 1 ? (
                          <DeleteOutlined
                            style={{ marginLeft: 10 }}
                            onClick={() => {
                              remove(field.name);
                            }}
                          />
                        ) : null}
                      </div>
                    }
                  >
                    <Form.Item noStyle {...field} name={[field.name, 'refId']}>
                      <div />
                    </Form.Item>
                    {/* ---- N36 批 H1 第 9 条（后端第九份第二节 8、第十份第二节 6）：面板 SQL 的两条硬要求写在输入框下面。
                        ①时间列必须起别名 `AS time`——后端只认 `time` / `__time__` 这两个列名，漏了别名图是空的、还不报错；
                        ②时序模式下「辅助配置」里的「值字段」（valueKey）必填，漏填后端直接回 `valueKey is required`。
                        文案羚牛自写，上游 fe 没有这一行。 */}
                    <Form.Item
                      className='n9e-mysql-dashboard-querybuilder-query-item'
                      label={
                        <div
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Space>
                            {t('query.query')}
                            <InfoCircleOutlined
                              onClick={() => {
                                DocumentDrawer({
                                  darkMode,
                                });
                              }}
                            />
                          </Space>
                          <Form.Item name={[field.name, 'query', 'mode']} initialValue={type === 'timeseries' ? 'timeSeries' : 'raw'} noStyle>
                            <Select>
                              <Select.Option value='timeSeries'>{t('query.dashboard.mode.timeSeries')}</Select.Option>
                              <Select.Option value='raw'>{t('query.dashboard.mode.table')}</Select.Option>
                            </Select>
                          </Form.Item>
                        </div>
                      }
                      {...field}
                      name={[field.name, 'query', 'query']}
                      validateTrigger={['onBlur']}
                      extra={<span className='second-color'>{t('query.dashboard_sql_tip')}</span>}
                      rules={[
                        {
                          required: true,
                          message: t('query.query_required'),
                        },
                      ]}
                      style={{ flex: 1 }}
                    >
                      <LogQL
                        datasourceCate={DatasourceCateEnum.mysql}
                        datasourceValue={datasourceValue}
                        query={{}}
                        historicalRecords={[]}
                        validateTrigger={[]}
                        placeholder={t('query.query_placeholder')}
                      />
                    </Form.Item>
                    {mode === 'timeSeries' && <AdvancedSettings mode='graph' span={8} prefixField={field} prefixName={[field.name, 'query']} expanded />}
                    <Row gutter={10}>
                      <Col flex='auto'>
                        <Form.Item
                          label='Legend'
                          {...field}
                          name={[field.name, 'legend']}
                          tooltip={{
                            getPopupContainer: () => document.body,
                            title: t('dashboard:query.legendTip2', {
                              interpolation: { skipOnVariables: true },
                            }),
                          }}
                        >
                          <LegendInput />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Panel>
                );
              })}

              <Form.ErrorList errors={errors} />
            </Collapse>
            <AddQueryButtons
              add={add}
              addQuery={(newRefId) => {
                add({
                  query: {
                    query: '',
                  },
                  refId: newRefId,
                });
              }}
            />
          </>
        );
      }}
    </Form.List>
  );
}
