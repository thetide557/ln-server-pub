import PageLayout from '@/components/pageLayout';
import { Button, Col, Divider, Form, Input, Row, Space, InputNumber, Select, Modal } from 'antd';
import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';

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

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [initialValues]);

  return (
    <PageLayout title={title} showBack>
      <Form layout='vertical' {...layout} disabled={disabled} form={form} onFinish={onFinish}>
        <Form.Item name='id' wrapperCol={hiddenLayout}>
          <InputNumber hidden></InputNumber>
        </Form.Item>
        <Row>
          <Col span={12}>
            <Form.Item name='title' label='标题' rules={[{ required: true }]}>
              <Input placeholder='请输入标题' />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name='config' label='配置' rules={[{ required: true }]}>
              <Input placeholder='请输入配置' />
            </Form.Item>
          </Col>
        </Row>
        <Row>
          <Col span={12}>
          <Form.Item name='desc' label='简介'>
              <Input.TextArea placeholder='请输入简介' />
            </Form.Item>
          </Col>
        </Row>
        <Divider></Divider>
        <Row justify='center'>
          <Space>
            <Button type='primary' htmlType='submit'>
              确定
            </Button>
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
