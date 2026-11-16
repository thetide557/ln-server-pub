import React from 'react';
import _ from 'lodash';
import { Row, Col, Form, Input, FormInstance, InputNumber, Space } from 'antd';
import { CloseOutlined, RightOutlined, DownOutlined } from '@ant-design/icons';
import { FormListFieldData } from 'antd/lib/form/FormList';
import { useTranslation } from 'react-i18next';

import { NAME_SPACE } from '../../constants';
import { mysqlLikePlaceholder } from '../config';

interface IProps {
  form: FormInstance;
  field: FormListFieldData;
  fields: FormListFieldData[];
  remove: (name: number) => void;
  type: string;
}

export default function Shard(props: IProps) {
  const { t } = useTranslation(NAME_SPACE);
  const { form, field, fields, remove, type } = props;
  const namePrefix = ['settings', `${type}.shards`];
  const { key, name, ...restField } = field;
  const [advancedVisible, setAdvancedVisible] = React.useState(false);

  return (
    <div key={key} className='n9e-datasource-form-mysql-shard'>
      <div>
        <Form.Item
          label={t('datasource.shards.addr')}
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
                  return Promise.reject(new Error(t('datasource.shards.addr_tip')));
                } else {
                  return Promise.resolve();
                }
              },
            }),
          ]}
        >
          <Input placeholder={mysqlLikePlaceholder[type].addr} />
        </Form.Item>

        <Row gutter={10}>
          <Col span={12}>
            <Form.Item
              label={t('datasource.shards.user')}
              {...restField}
              name={[name, `${type}.user`]}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input placeholder={t('datasource.shards.user')} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={t('datasource.shards.password')}
              {...restField}
              name={[name, `${type}.password`]}
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input.Password
                placeholder={t('datasource.shards.password')}
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
          {t('datasource.shards.help')}
        </div>
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
                    label={t(`datasource.timeout`)}
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
                    label={t(`datasource.max_query_rows`)}
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
                    label={t(`datasource.max_idle_conns`)}
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
                    label={t(`datasource.max_open_conns`)}
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
                    label={t(`datasource.conn_max_lifetime`)}
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
                {/* ---- N36 批 H1 第 1 条（后端第九份第二节 1，`A-MYSQL-DSN-LOC-01`）：
                    界面建的 mysql 数据源，查出来的时间戳整体 +8 小时。原因是 go-sql-driver 不带 `loc` 参数时
                    按 UTC 解析 DATETIME；后端收 `settings['mysql.shards'][i]['mysql.dsn_extra_params']`
                    （`ln-server/dskit/mysql/mysql.go:37`，分片级键），原样拼进 DSN 的 query 片段
                    （`dskit/mysql/dsn_params.go:18-52` 的 NormalizeDSNExtraParams，带不带开头的 `?` / `&` 都接）。
                    所以这里给一个默认 `loc=Local` 的输入框，界面建的源就不再偏 8 小时。
                    上游 fe `ee48e701` 全仓 `git grep dsn_extra_params` 零命中 → **上游无此栏**，按后端键名自加
                    （lead 预拍 D-N36-18）。这个组件只被 mysql 的 Conn 用（pgsql 走 `@/components/DBSettings/Conn`），
                    所以用 `${type}` 拼键不会串到别的源。 */}
                <Col span={12}>
                  <Form.Item label={t(`datasource.dsn_extra_params`)} tooltip={t(`datasource.dsn_extra_params_tip`)} {...restField} name={[name, `${type}.dsn_extra_params`]} initialValue='loc=Local'>
                    <Input placeholder='loc=Local' />
                  </Form.Item>
                </Col>
              </Row>
            </div>
          </div>
        </div>
      </div>
      {fields.length > 1 && (
        <div className='n9e-datasource-form-mysql-shard-close'>
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
