import React from 'react';
import _ from 'lodash';
import { Row, Col, Form, Input, FormInstance, Space, InputNumber } from 'antd';
import { CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { FormListFieldData } from 'antd/lib/form/FormList';
import { useTranslation } from 'react-i18next';

import { NAME_SPACE } from '@/plugins/mysql/constants';

import { mysqlLikePlaceholder } from './config';
import './style.less';

interface IProps {
  form: FormInstance;
  field: FormListFieldData;
  fields: FormListFieldData[];
  remove: (name: number) => void;
  type: string;
}

export default function Shard(props: IProps) {
  const { t } = useTranslation();
  const { form, field, fields, remove, type } = props;
  const namePrefix = ['settings', `${type}.shards`];
  const { key, name, ...restField } = field;
  const [advancedVisible, setAdvancedVisible] = React.useState(false);

  return (
    <div key={key} className='n9e-datasource-form-shard'>
      <div>
        <Form.Item
          label={t(`${NAME_SPACE}:datasource.shards.addr`)}
          {...restField}
          name={[name, `${type}.addr`]}
          rules={[
            {
              required: true,
            },
            () => ({
              validator(_, value) {
                const fieldOfThisColumn = form.getFieldValue(namePrefix).map((item) => item[`${type}.addr`]);

                if (fieldOfThisColumn.filter((item) => item === value).length > 1) {
                  return Promise.reject(new Error(t(`${NAME_SPACE}:datasource.shards.addr_tip`)));
                } else {
                  return Promise.resolve();
                }
              },
            }),
          ]}
        >
          <Input placeholder={mysqlLikePlaceholder[type].addr} />
        </Form.Item>
        {/* 「数据库」输入框：上游 fe（v9.1.0 与 ee48e701）这个组件和 src/plugins/mysql/Datasource/components/Shard.tsx 都没有这一项，
            但 `defaultShardValues`（./config.ts:32）和 `mysqlLikePlaceholder`（./config.ts:6,10）早就留了 `<type>.db` 的键与 placeholder。
            pgsql 后端是实际必填的：库名为空时第一次真查询就报 `empty pgsql database`
            （ln-server `dskit/postgres/postgres.go:75-77`，注释说是兼容阿里实时数仓 Hologres），
            而数据源本身存得进（后端对 pgsql 不跑连通性检查），表现为「数据源看着好好的，面板和告警规则全报这一句」。
            所以这里羚牛自修补上输入框，且只对 pgsql 必填——mysql / ck 后端允许库名为空，保持不必填。 */}
        <Form.Item
          label={t(`${NAME_SPACE}:datasource.shards.db`)}
          {...restField}
          name={[name, `${type}.db`]}
          rules={type === 'pgsql' ? [{ required: true }] : []}
        >
          <Input placeholder={mysqlLikePlaceholder[type].db} />
        </Form.Item>
        <Row gutter={10}>
          <Col span={12}>
            <Form.Item
              label={t(`${NAME_SPACE}:datasource.shards.user`)}
              {...restField}
              name={[name, `${type}.user`]}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input placeholder={t(`${NAME_SPACE}:datasource.shards.user`)} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={t(`${NAME_SPACE}:datasource.shards.password`)}
              {...restField}
              name={[name, `${type}.password`]}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input.Password
                visibilityToggle={false}
                placeholder={t(`${NAME_SPACE}:datasource.shards.password`)}
                onChange={(e) => {
                  form.setFields([
                    {
                      name: [...namePrefix, name, type + '.is_encrypt'],
                      value: false,
                    },
                  ]);
                }}
              />
            </Form.Item>
          </Col>
        </Row>
        <div
          className='second-color'
          style={{
            marginBottom: 10,
          }}
        >
          {t(`${NAME_SPACE}:datasource.shards.help`)}
        </div>
        {_.includes(['mysql', 'pgsql'], type) && (
          <div>
            <div>
              <Space
                className='cursor-pointer'
                onClick={() => {
                  setAdvancedVisible(!advancedVisible);
                }}
              >
                {t('common:advanced_settings')}
                {advancedVisible ? <DownOutlined /> : <RightOutlined />}
              </Space>
              <div
                className='mt-2'
                style={{
                  display: advancedVisible ? 'block' : 'none',
                }}
              >
                <Row gutter={10}>
                  <Col span={12}>
                    <Form.Item
                      label={t(`${NAME_SPACE}:datasource.timeout`)}
                      {...restField}
                      name={[name, `${type}.timeout`]}
                      rules={[
                        {
                          type: 'number',
                          min: 0,
                        },
                      ]}
                      initialValue={60}
                    >
                      <InputNumber
                        style={{
                          width: '100%',
                        }}
                        controls={false}
                        placeholder='60'
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={t(`${NAME_SPACE}:datasource.max_query_rows`)}
                      {...restField}
                      name={[name, `${type}.max_query_rows`]}
                      rules={[
                        { required: true },
                        {
                          type: 'number',
                          min: 0,
                        },
                      ]}
                      initialValue={500}
                    >
                      <InputNumber
                        style={{
                          width: '100%',
                        }}
                        controls={false}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label={t(`${NAME_SPACE}:datasource.max_idle_conns`)}
                      {...restField}
                      name={[name, `${type}.max_idle_conns`]}
                      rules={[
                        {
                          type: 'number',
                          min: 0,
                        },
                      ]}
                    >
                      <InputNumber
                        style={{
                          width: '100%',
                        }}
                        controls={false}
                        placeholder='10'
                      />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item
                      label={t(`${NAME_SPACE}:datasource.max_open_conns`)}
                      {...restField}
                      name={[name, `${type}.max_open_conns`]}
                      rules={[
                        {
                          type: 'number',
                          min: 0,
                        },
                      ]}
                    >
                      <InputNumber
                        style={{
                          width: '100%',
                        }}
                        controls={false}
                        placeholder='100'
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={t(`${NAME_SPACE}:datasource.conn_max_lifetime`)}
                      {...restField}
                      name={[name, `${type}.conn_max_lifetime`]}
                      rules={[
                        {
                          type: 'number',
                          min: 0,
                        },
                      ]}
                    >
                      <InputNumber
                        style={{
                          width: '100%',
                        }}
                        controls={false}
                        placeholder='14400'
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>
            </div>
          </div>
        )}
      </div>
      {fields.length > 1 && (
        <div className='n9e-datasource-form-shard-close'>
          <CloseOutlined
            onClick={() => {
              remove(name);
            }}
          />
        </div>
      )}
    </div>
  );
}
