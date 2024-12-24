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
import { Col, Form, Input, Row, Select, Space, TreeSelect } from 'antd';
import { getUserInfo, getNotifyChannels, getRoles, getTeamInfoList, } from '@/services/manage';
import { UserAndPasswordFormProps, Contacts, ContactsItem, User } from '@/store/manageInterface';
import { MinusCircleOutlined, PlusCircleOutlined, CaretDownOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Link } from 'react-router-dom';
import { getOrganizationTree } from '@/services/assets';

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
      console.log("初始化数据擦好看", data)
      setInitialValues(
        Object.assign({}, data, {
          contacts,
        }),
      );
      setLoading(false);
    });
  };
  const formItemLayout = { labelCol: { span: 6 }, wrapperCol: { span: 10 } };
  const validatePassword = (_, value) => {
    if (value && value.length >= 8) {
      const count = [/[a-z]/, /[A-Z]/, /\d/, /[!@#$%^&-*.]/].reduce((acc, regex) => {
        return acc + (regex.test(value) ? 1 : 0);
      }, 0);
      if (count >= 3) {
        return Promise.resolve();
      }
    }
    return Promise.reject('密码必须大于8位，并且包含大写字母、小写字母、数字和符号中的任意三种');
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
            <Select mode='multiple'>
              {roleList.map((item, index) => (
                <Option value={item.name} key={index}>
                  <div>
                    <div>{item.name}</div>
                    <div style={{ color: '#8c8c8c' }}>{item.note}</div>
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
          <Form.Item label={t('account:profile.phone')} name='phone'>
            <Input />
          </Form.Item>
        </Col>
        <Col span={12} key={"item-" + 8}>
          <Form.Item label={'所属团队'} name='group_name'>
            <Select mode='multiple' options={treeData}>

            </Select>

          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        label={
          <Space>
            {t('account:profile.moreContact')}
            <Link to='/help/notification-settings?tab=contacts' target='_blank'>
              {t('account:profile.moreContactLinkToSetting')}
            </Link>
          </Space>
        }
        labelCol={{span: 7 }}
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
              <PlusCircleOutlined style={{padding: '0 5px'}} className='control-icon-normal' onClick={() => add()} />
            </>
          )}
        </Form.List>
      </Form.Item>
    </Form>
  ) : null;
});
export default UserForm;
