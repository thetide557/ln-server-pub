import React, { useEffect } from 'react';
import { Alert, Form, Input, Switch, Button, Space, InputNumber, Row, Col, message } from 'antd';
import { PlusCircleOutlined, MinusCircleOutlined, CloseOutlined } from '@ant-design/icons';
import { useTranslation, Trans } from 'react-i18next';
import _ from 'lodash';
import { CommonStateContext } from '@/App';
import { getWebhooks, putWebhooks } from './services';

export default function Webhooks() {
  const { t } = useTranslation('notificationSettings');
  const [form] = Form.useForm();
  // 第六步 N33-D (d)（拍板 L-07）：后端第七份交接 6.1 把 `PUT /webhooks` 改成**仅 Admin 可写**
  // （证据：ln-server `center/router/router.go:831` → `pages.PUT("/webhooks", rt.auth(), rt.admin(), rt.webhookPuts)`）。
  // 这里只把「会发那条 PUT 的入口」藏起来，**不是权限控制**——接口仍由后端 `rt.admin()` 拦，非 Admin 硬发请求照样 403。
  // 判法只认 Admin 角色、**不夹权限点那一半**（羚牛别处常写「Admin 角色 或 某个权限点」，这里不这么写），
  // 因为后端 6.1 只认角色、不认权限点。
  // 表单本体对非 Admin 仍可看、可填（不加只读属性）：保存按钮没了就改不到后端。
  const { profile } = React.useContext(CommonStateContext);
  const isAdmin = profile?.roles?.includes('Admin');

  useEffect(() => {
    getWebhooks().then((res) => {
      form.setFieldsValue({
        webhooks: _.map(res, (item) => {
          return {
            ...item,
            headers: _.map(item.headers, (value, key) => {
              return {
                key,
                value,
              };
            }),
          };
        }),
      });
    });
  }, []);

  return (
    <div className='webhooks-container'>
      <div className='webhooks-content'>
        <Form form={form} layout='vertical'>
          <Form.List name='webhooks'>
            {(fields, { add, remove }) => {
              return (
                <div>
                  {fields.map((field, idx) => (
                    <div className='webhook-item' key={field.key}>
                      <div style={{ marginBottom: 10 }}>
                        <Space align='baseline'>
                          {t('webhooks.enable')}
                          <Form.Item {...field} name={[field.name, 'enable']} valuePropName='checked' noStyle>
                            <Switch />
                          </Form.Item>
                        </Space>
                      </div>
                      <Form.Item {...field} label={t('webhooks.note')} name={[field.name, 'note']}>
                        <Input />
                      </Form.Item>
                      <Form.Item {...field} label={t('webhooks.url')} name={[field.name, 'url']} rules={[{ required: true }]}>
                        <Input />
                      </Form.Item>
                      <Form.Item {...field} label={t('webhooks.timeout')} name={[field.name, 'timeout']}>
                        <InputNumber style={{ width: '100%' }} defaultValue={5} />
                      </Form.Item>
                      <Row gutter={10}>
                        <Col span={12}>
                          <Form.Item {...field} label={t('webhooks.basic_auth_user')} name={[field.name, 'basic_auth_user']}>
                            <Input />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item {...field} label={t('webhooks.basic_auth_password')} name={[field.name, 'basic_auth_pass']}>
                            <Input.Password />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Form.List {...field} name={[field.name, 'headers']}>
                        {(headers, { add, remove }) => {
                          return (
                            <div>
                              <div>
                                Headers{' '}
                                <PlusCircleOutlined
                                  onClick={() => {
                                    add();
                                  }}
                                />
                              </div>
                              {headers.length > 0 ? (
                                <Row gutter={10}>
                                  <Col flex='auto'>
                                    <Row gutter={10}>
                                      <Col span={12}>Header</Col>
                                      <Col span={12}>Value</Col>
                                    </Row>
                                  </Col>
                                  <Col flex='32px'></Col>
                                </Row>
                              ) : (
                                <div style={{ marginBottom: 10 }} />
                              )}
                              {headers.map((header, idx) => (
                                <Row gutter={10} key={header.key}>
                                  <Col flex='auto'>
                                    <Row gutter={10}>
                                      <Col span={12}>
                                        <Form.Item {...header} name={[header.name, 'key']}>
                                          <Input />
                                        </Form.Item>
                                      </Col>
                                      <Col span={12}>
                                        <Form.Item {...header} name={[header.name, 'value']}>
                                          <Input />
                                        </Form.Item>
                                      </Col>
                                    </Row>
                                  </Col>
                                  <Col flex='32px'>
                                    <MinusCircleOutlined
                                      style={{ marginTop: 8 }}
                                      onClick={() => {
                                        remove(header.name);
                                      }}
                                    />
                                  </Col>
                                </Row>
                              ))}
                            </div>
                          );
                        }}
                      </Form.List>
                      <Space align='baseline'>
                        {t('webhooks.skip_verify')}
                        <Form.Item {...field} name={[field.name, 'skip_verify']} noStyle valuePropName='checked'>
                          <Switch />
                        </Form.Item>
                      </Space>
                      {fields.length > 1 && (
                        <div className='webhook-item-remove'>
                          <CloseOutlined
                            onClick={() => {
                              remove(field.name);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <Button
                    style={{ width: '100%' }}
                    onClick={() => {
                      add();
                    }}
                  >
                    {t('webhooks.add')}
                  </Button>
                </div>
              );
            }}
          </Form.List>
          {/* 第六步 N33-D (d)：唯一会发 `PUT /webhooks` 的控件就是这个保存按钮，非 Admin 不渲染。
              上面 Form.List 的「添加」(:150) 和行内的 X 删除 (:141) 只动本地表单状态、不发请求，所以不动
              （L-07 的口径是「写入口 = 会发那 5 条 PUT 的任何控件」，这两个不发）。 */}
          {isAdmin ? (
            <div style={{ marginTop: 16 }}>
              <Button
                type='primary'
                onClick={() => {
                  form.validateFields().then((values) => {
                    const data = _.map(values.webhooks, (item) => {
                      return {
                        ...item,
                        headers: _.reduce(
                          item.headers,
                          (result, value) => {
                            result[value.key] = value.value;
                            return result;
                          },
                          {},
                        ),
                      };
                    });
                    putWebhooks(data).then(() => {
                      message.success(t('common:success.save'));
                    });
                  });
                }}
              >
                {t('common:btn.save')}
              </Button>
            </div>
          ) : null}
        </Form>
      </div>
      {/* <div className='webhooks-doc'>
        <Alert
          type='info'
          message={
            <Trans
              ns='notificationSettings'
              i18nKey='webhooks.help'
              components={{
                a: <a href='https://console.flashcat.cloud/?from=n9e' target='_blank' />,
                br: <br />,
              }}
            />
          }
        />
      </div> */}
    </div>
  );
}
