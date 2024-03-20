import React, { useEffect, useState } from 'react';
import { Form, Row, Col, Input, Button, Select } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import Collapse, { Panel } from '../Components/Collapse';
import getFirstUnusedLetter from '../../Renderer/utils/getFirstUnusedLetter';
import { replaceExpressionVars } from '../../VariableConfig/constant';
import { getApiServiceOptions } from '@/services/api_service';

const alphabet = 'ABCDEFGHIGKLMNOPQRSTUVWXYZ'.split('');

export default function ApiService({ chartForm, variableConfig, dashboardId }) {
  const { t } = useTranslation('dashboard');
  const [options, setOptions] = useState([]);

  useEffect(() => {
    getApiServiceOptions().then((res) => {
      setOptions(res.dat);
    });
  }, []);

  return (
    <Form.List name='targets'>
      {(fields, { add, remove }, { errors }) => {
        return (
          <>
            <Collapse>
              {_.map(fields, (field, index) => {
                return (
                  <Panel
                    header={
                      <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                          return getFieldValue(['targets', field.name, 'refId']) || alphabet[index];
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
                    <Row gutter={10}>
                      <Col span={20}>
                        <Form.Item shouldUpdate={(prevValues, curValues) => _.isEqual(prevValues.datasourceValue, curValues.datasourceValue)} noStyle>
                          {({ getFieldValue }) => {
                            let datasourceValue = getFieldValue('datasourceValue');
                            datasourceValue = variableConfig ? replaceExpressionVars(datasourceValue, variableConfig, variableConfig.length, dashboardId) : datasourceValue;
                            return (
                              <Form.Item
                                label='数据接口服务'
                                {...field}
                                name={[field.name, 'expr']}
                                validateTrigger={['onBlur']}
                                rules={[
                                  {
                                    required: true,
                                  },
                                ]}
                                style={{ flex: 1, width: '100% ' }}
                              >
                                <Select options={options} fieldNames={{ label: 'name', value: 'code' }}></Select>
                              </Form.Item>
                            );
                          }}
                        </Form.Item>
                      </Col>
                      <Col span={4}>
                        <Form.Item
                          label='字符矩阵参量'
                          {...field}
                          name={[field.name, 'legend']}
                          tooltip={{
                            getPopupContainer: () => document.body,
                            title:
                              'Controls the name of the time series, using name or pattern. For example {{hostname}} will be replaced with label value for the label hostname.',
                          }}
                        >
                          <Input />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Panel>
                );
              })}

              <Form.ErrorList errors={errors} />
            </Collapse>
            <Button
              style={{ width: '100%', marginTop: 10 }}
              onClick={() => {
                add({ expr: '', refId: getFirstUnusedLetter(_.map(chartForm.getFieldValue('targets'), 'refId')) });
              }}
            >
              + 添加查询
            </Button>
          </>
        );
      }}
    </Form.List>
  );
}
