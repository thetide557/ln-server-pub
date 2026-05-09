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
// @ts-nocheck
import React, { useEffect, useState, useImperativeHandle, ReactNode } from 'react';
import { Col, Form, Input, Row, Select, Space, TreeSelect, InputNumber, DatePicker, Switch } from 'antd';
import { getUserInfo, getNotifyChannels, getRoles, getTeamInfoList, } from '@/services/manage';
import { UserAndPasswordFormProps, Contacts, ContactsItem, User } from '@/store/manageInterface';
import { MinusCircleOutlined, PlusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import { getOrganizationTree } from '@/services/assets';
import moment from 'moment';
import { timestampToCST } from "@/utils/day";

const { Option } = Select;
const UserForm = React.forwardRef<ReactNode, UserAndPasswordFormProps>((props, ref) => {
  const { t } = useTranslation();
  const { userId } = props;
  const [form] = Form.useForm();
  const [initialValues, setInitialValues] = useState<User>();
  const [loading, setLoading] = useState<boolean>(true);
  const [contactsList, setContactsList] = useState<ContactsItem[]>([]);
  const [roleList, setRoleList] = useState<{ name: string; note: string }[]>([]);


  const [treeData, setTreeData] = useState<any[]>();

  useImperativeHandle(ref, () => ({
    form: form,
  }));
  useEffect(() => {
    if (userId) {
      getUserInfoDetail(userId);
    } else {
      setLoading(false);
    }
    getTeamInfoList({ query: '' }).then(({ dat }) => {
      let contacts: Array<any> = [];
      dat.forEach((item, index) => {
        let val: any = {
          value: item.id,
          label: item.name,
        };
        contacts.push(val);
      });
      setTreeData(contacts);
    });

    getContacts();
    getRoles().then((res) => setRoleList(res));
  }, []);

  const getContacts = () => {
    getNotifyChannels().then((data: Array<ContactsItem>) => {
      setContactsList(data);
    });
  };

  const getUserInfoDetail = (id: string) => {
    getUserInfo(id).then((data: User) => {
      let contacts: Array<Contacts> = [];

      if (data.contacts) {
        Object.keys(data.contacts).forEach((item: string) => {
          let val: Contacts = {
            key: item,
            value: data.contacts[item],
          };
          contacts.push(val);
        });
      }
      data.lock_enabled = data.lock_enabled === 1 ? true : false;
      data.temp_user_expire_at = moment(timestampToCST(data.temp_user_expire_at), 'YYYY-MM-DD');
      console.log("初始化数据擦好看", data)
      setInitialValues(
        Object.assign({}, data, {
          contacts,
        }),
      );
      setLoading(false);
    });
  };
  const formItemLayout = { labelCol: { span: 10 }, wrapperCol: { span: 10 } };
  const validatePassword = (_, value) => {
    if (value && value.length >= 12) {
      const count = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&-*.]/].reduce((acc, regex) => {
        return acc + (regex.test(value) ? 1 : 0);
      }, 0);
      if (count >= 3) {
        return Promise.resolve();
      }
    }
    return Promise.reject('密码必须大于12位，并且包含大写字母、小写字母、数字和符号中的任意三种');
  };
  return !loading ? (
    <Form {...formItemLayout} layout={'horizontal'} form={form} initialValues={initialValues} preserve={false}>
      <Row>
        {!userId && (
          <Col span={12} key={"item-" + 0}>
            <Form.Item
              label={t('account:profile.username')}
              name='username'
              rules={[
                {
                  required: true,
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        )}
        <Col span={12} key={"item-" + 1}>
          <Form.Item label={t('account:profile.nickname')} name='nickname'>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      {!userId && (
        <>
          <Row>
            <Col span={12} key={"item-" + 3}>
              <Form.Item
                name='password'
                label={t('account:password.name')}
                rules={[
                  {
                    required: true,
                  },
                  {
                    validator: validatePassword,
                  },
                ]}
                hasFeedback
              >
                <Input.Password />
              </Form.Item>
            </Col>
            <Col span={12} key={"item-" + 4}>
              <Form.Item
                name='confirm'
                label={t('account:password.confirm')}
                dependencies={['password']}
                hasFeedback
                rules={[
                  {
                    required: true,
                  },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }

                      return Promise.reject(new Error(t('account:password.notMatch')));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>
            </Col>
          </Row>
        </>
      )}
      <Row>
        <Col span={12} key={"item-" + 5}>
          <Form.Item
            label={t('account:profile.role')}
            name='roles'
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Select
              mode='multiple'
              onChange={(values) => {
                if (values.includes('临时用户')) {
                  form.setFieldsValue({ roles: ['临时用户'] });
                }
              }}
            >
              {roleList.map((item, index) => (
                <Option value={item.name} key={index}>
                  <div>
                    <div>{item.name}</div>
                    <div style={{ color: '#8c8c8c', overflowY: 'auto' }}>{item.note}</div>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
        <Col span={12} key={"item-" + 6}>
          <Form.Item label={t('account:profile.email')} name='email' rules={[
            {
              required: true,
            }
          ]}>
            <Input />
          </Form.Item>
        </Col>
      </Row>
      <Row>
        <Col span={12} key={"item-" + 7}>
          <Form.Item label={t('account:profile.phone')} name='phone' rules={[
            {
              required: true,
            },
          ]}>
            <Input />
          </Form.Item>
        </Col>
        {
          !userId && (
            <Col span={12} key={"item-" + 8}>
              <Form.Item label={'所属团队'} name='group_id' rules={[
                {
                  required: true,
                },
              ]}>
                <Select mode='multiple' options={treeData}>

                </Select>

              </Form.Item>
            </Col>
          )
        }
        <Col span={12} key={"item-" + 10}>
          <Form.Item label={'单一会话'} name='single_session' initialValue={2} rules={[
            {
              required: true,
            },
          ]}>
            <Select options={[
              // { label: '关闭', value: 0 },
              { label: '启用', value: 1 },
              { label: '禁用', value: 2 },
            ]}>
            </Select>
          </Form.Item>
        </Col>
        {/* <Col span={12} key={"item-" + 8}>
          <Form.Item label={'所属团队'} name='group_id' rules={[
              {
                required: true,
              },
            ]}>
            <Select mode='multiple' options={treeData}>

            </Select>

          </Form.Item>
        </Col> */}
        {/* <Col span={12} key={"item-" + 9}>
          <Form.Item label={'门户用户名'} name='mh_username'>
              <Input />
          </Form.Item>
        </Col> */}
        {
          !form.getFieldValue('roles')?.includes("Admin") && <>
            <Col span={12} key={"item-" + 11}>
              <Form.Item label={t('密码有效期（天）')} name='password_valid_days' initialValue={90} rules={[
                {
                  required: true,
                },
                {
                  validator: (_, value) => {
                    if (value <= 0) {
                      return Promise.reject(new Error('密码有效期必须大于0'));
                    }
                    if (value && !Number.isInteger(value)) {
                      return Promise.reject(new Error('密码有效期必须为整数'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}>
                <InputNumber style={{ width: '100%' }} precision={0} />
              </Form.Item>
            </Col>
            <Col span={12} key={"item-" + 12}>
              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) => prevValues.roles !== currentValues.roles}
              >
                {({ getFieldValue }) =>
                  getFieldValue('roles')?.includes('临时用户') ? (
                    <Form.Item name="temp_user_expire_at" label={t('使用期限至')} rules={[
                      {
                        required: true,
                        message: '请选择使用期限'
                      },
                      {
                        validator: (_, value) => {
                          if (value) {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const selectedDate = new Date(value);
                            selectedDate.setHours(0, 0, 0, 0);
                            if (selectedDate <= today) {
                              return Promise.reject(new Error('使用期限不能早于或等于当前日期'));
                            }
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}>
                      <DatePicker
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                        disabledDate={(current) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          return current && current.valueOf() <= today.valueOf();
                        }}
                      />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Col>
          </>
        }
      </Row>
      {
        !form.getFieldValue('roles')?.includes("Admin") && <Row>
          <Col span={12} key={"item-" + 13}>
            <Form.Item label={t('账号锁定策略')} name='lock_enabled' initialValue={true} valuePropName="checked">
              <Switch
                checkedChildren="启用"
                unCheckedChildren="关闭"
              />
            </Form.Item>
          </Col>
          <Col span={12} key={"item-" + 14}>
            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.lock_enabled !== currentValues.lock_enabled}
            >
              {({ getFieldValue }) =>
                getFieldValue('lock_enabled') == 1 ? (
                  <div style={{ display: 'flex' }}>
                    <Form.Item
                      label={t('连续')}
                      name='lock_consecutive_days'
                      initialValue={90}
                      rules={[
                        {
                          required: true,
                          message: '请输入连续未登录天数'
                        },
                        {
                          validator: (_, value) => {
                            if (value <= 0) {
                              return Promise.reject(new Error('连续未登录天数必须大于0'));
                            }
                            if (value && !Number.isInteger(value)) {
                              return Promise.reject(new Error('连续未登录天数必须为整数'));
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
                    >
                      <InputNumber precision={0} />
                    </Form.Item>
                    <span style={{ marginLeft: '15px', marginTop: '7px', color: 'rgba(0, 0, 0, 0.85)', fontSize: '12px' }}>天未登录，自动锁定账号</span>
                  </div>
                ) : null
              }
            </Form.Item>
          </Col>
        </Row>
      }
      <Form.Item
        label={
          <Space>
            {t('account:profile.moreContact')}
            {/* <Link to='/help/notification-settings?tab=contacts' target='_blank'>
              {t('account:profile.moreContactLinkToSetting')}
            </Link> */}
            <div style={{ color: '#005fb6', cursor: 'pointer' }} onClick={() => { window.open('/help/notification-settings?tab=contacts') }}>
              {t('account:profile.moreContactLinkToSetting')}
            </div>
          </Space>
        }
        labelCol={{ span: 7 }}
      >
        <Form.List name='contacts'>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, fieldKey, ...restField }) => (
                <Space
                  key={key}
                  style={{
                    display: 'flex',
                  }}
                  align='baseline'
                >
                  <Form.Item
                    style={{
                      width: '170px',
                    }}
                    {...restField}
                    name={[name, 'key']}
                    rules={[
                      {
                        required: true,
                        message: '是必选/必填项',
                      },
                    ]}
                  >
                    <Select suffixIcon={<CaretDownOutlined />} placeholder={t('account:profile.moreContactPlaceholder')}>
                      {_.map(contactsList, (item, index) => (
                        <Option value={item.key} key={index}>
                          {item.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    {...restField}
                    style={{
                      width: '170px',
                    }}
                    name={[name, 'value']}
                    rules={[
                      {
                        required: true,
                        message: '是必选/必填项',
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <MinusCircleOutlined className='control-icon-normal' onClick={() => remove(name)} />
                </Space>
              ))}
              <PlusCircleOutlined style={{ padding: '0 5px' }} className='control-icon-normal' onClick={() => add()} />
            </>
          )}
        </Form.List>
      </Form.Item>
    </Form>
  ) : null;
});
export default UserForm;
