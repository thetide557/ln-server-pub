import PageLayout from '@/components/pageLayout';
import { executeApiService } from '@/services/api_service';
import { Button, Col, Divider, Form, Input, Row, Space, InputNumber, Select, Modal } from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { listAllNotBoundScreenCode, listAllNotBoundGroupName } from '@/services/sxxc/bigScreen';

interface IProps {
  title?: string;
  disabled?: boolean;
  initialValues?: any;
  onFinish?: (value) => void;
}

export default function ({ title, disabled, initialValues, onFinish }: IProps) {
  const [form] = Form.useForm();
  const history = useHistory();
  const layout = {
    labelCol: { offset: 1 },
    wrapperCol: { span: 22, offset: 1 },
  };
  const hiddenLayout = { span: 0 };
  const [groupList, setGroupList] = useState([])
  const [addressList, setAddressList] = useState([])

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues]);

  useEffect(() => {
    listAllNotBoundScreenCode().then(res => {
      if (res.code == 200) {
        setAddressList(res.data[1])
      }
    })
    // listAllNotBoundGroupName().then(res => {
    //   if (res.code == 200) {
    //     setGroupList(res.data[1])
    //   }
    // })
  }, [])

  return (
    <PageLayout title={title} showBack>
      <Form layout='vertical' {...layout} disabled={disabled} form={form} onFinish={onFinish}>
        <Form.Item name='id' wrapperCol={hiddenLayout}>
          <InputNumber hidden></InputNumber>
        </Form.Item>
        <Row>
          <Col span={12}>
            <Form.Item name='groupName' label='大屏名称' rules={[{ required: true }]}>
              {/* <Select
                placeholder='请选择项目组'
              >
                {groupList.map((item, index) => (
                  <Select.Option value={item} key={index}>
                    {item}
                  </Select.Option>
                ))}
              </Select> */}
              <Input placeholder='请输入大屏名称' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='screenCode' label='大屏code' rules={[{ required: true }]}>
              <Select
                placeholder='请选择大屏code'
              >
                {addressList.map((item, index) => (
                  <Select.Option value={item} key={index}>
                    {item}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          {/* <Col span={12}>
            <Form.Item name='datasource_id' label='数据源' rules={[{ required: true }]}>
              <Select options={[{ value: 0, label: 'default' }]} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='value_field' label='取值字段' rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='script' label='执行脚本' rules={[{ required: true }]}>
              <Input.TextArea />
            </Form.Item>
          </Col> */}
        </Row>
        <Divider></Divider>
        <Row justify='center'>
          <Space>
            <Button type='primary' htmlType='submit'>
              确定
            </Button>
            {/* <Button
              type='default'
              onClick={() => {
                const id = form.getFieldValue('id');
                executeApiService(id).then((res) => {
                  Modal.info({
                    title: '测试结果',
                    content: JSON.stringify(res.dat),
                  });
                });
              }}
            >
              测试
            </Button> */}
            <Button
              onClick={() => {
                history.goBack();
              }}
            >
              取消
            </Button>
          </Space>
        </Row>
      </Form>
    </PageLayout>
  );
}
