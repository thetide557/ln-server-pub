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
import React, { useEffect, useState, useImperativeHandle, ReactNode } from 'react';
import { Button, Col, Form, Input, InputNumber, Row, Select, Space } from 'antd';
import { getUserInfo, getNotifyChannels, getRoles } from '@/services/manage';
import PageLayout from '@/components/pageLayout';
import { UserAndPasswordFormProps, Contacts, ContactsItem, User } from '@/store/manageInterface';
import queryString from 'query-string';
import { useTranslation } from 'react-i18next';
import _ from 'lodash';
import { Link, useHistory, useLocation } from 'react-router-dom';



const { Option } = Select;
const PlanForm = React.forwardRef<ReactNode, UserAndPasswordFormProps>((props, ref) => {
  const { t } = useTranslation();
  const { userId } = props;
  const [form] = Form.useForm();
  const history = useHistory()
  const [initialValues, setInitialValues] = useState<User>();
  const [loading, setLoading] = useState<boolean>(true);
  const { search } = useLocation();
  const query = queryString.parse(search);
  const [title, setTitle] = useState<String>('添加巡检计划');
  const [roleList, setRoleList] = useState<{ name: string; note: string }[]>([]);

  const formItemLayout = {
    labelCol: {
      xs: { span: 24 },
      sm: { span: 6 },
    },
    wrapperCol: {
      xs: { span: 24 },
      sm: { span: 14 },
    },
  };
  const layout = {
    labelCol: { span: 8 },
    wrapperCol: { span: 16 },
  };
  const tailFormItemLayout = {
    wrapperCol: {
      xs: {
        span: 24,
        offset: 0,
      },
      sm: {
        span: 14,
        offset: 6,
      },
      
    },
  };
  useImperativeHandle(ref, () => ({
    form: form,
  }));
  useEffect(() => {
    console.log("queyr ",query);
    if (query.id) {
      getInfoDetail(''+query.id);
      setTitle('修改巡检计划');
    } else {
      setLoading(false);
    }
  }, []);

 

  const getInfoDetail = (id: string) => {
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

      setInitialValues(
        Object.assign({}, data, {
          contacts,
        }),
      );
      setLoading(false);
    });
  };

  return !loading ? (
    <PageLayout title={title} showBack backPath='/inspection/plans' >
      <div className='event-detail-container' style={{margin:'0 50px 50px 20px'}}>
        <Form  {...layout} form={form} initialValues={initialValues} preserve={false}>
          <Form.Item
            {...formItemLayout}
            label={t('巡检任务名称')}
            name='username'
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item label={t('巡检负责人')} name='nickname'  {...formItemLayout}>
            <Input />
          </Form.Item>
          <Form.Item label={t('巡检区域')}
            name='roles'
            {...formItemLayout}
            rules={[
              {
                required: true,
              },
            ]}>
            <Input />
          </Form.Item>
          <Form.Item
            {...formItemLayout}
            label={t('巡检时间')}
            name='roles'
          >
            <Row gutter={16}>
              <Col span={4}>
                <Form.Item label='' name='recover_duration' tooltip={t('recover_duration_tip')}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={5}>
              <Select defaultValue="lucy" style={{ width: 120 }}  >
                <Option value="jack">天</Option>
                <Option value="lucy">周</Option>
              </Select>
              </Col>
              <Col span={4}>
                <Form.Item label={t('时')} name='recover_duration' tooltip={t('recover_duration_tip')}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item
                  label={t('分')}
                  name='notify_repeat_step'
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={5}>
                <Form.Item
                  label={t('秒')}
                  name='notify_max_number'
                  // rules={[
                  //   {
                  //     required: true,
                  //   },
                  // ]}
                  tooltip={t('notify_max_number_tip')}
                >
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          </Form.Item>

          <Form.Item  {...formItemLayout} label={t('巡检报备')} name='phone'>
            <Input />
          </Form.Item>
          <Form.Item  {...formItemLayout} label={t('报告接收人')} name='phone'>
            <Input />
          </Form.Item>
          <Form.Item {...tailFormItemLayout}>
            <Button type="primary" htmlType="submit" style={{marginLeft:'33%', marginRight: '50px' }}>保存</Button>
            <Button onClick={() =>{
                     history.goBack()
            }}>返回列表</Button>
          </Form.Item>
        </Form>
      </div>
    </PageLayout>
  ) : null;
});
export default PlanForm;
