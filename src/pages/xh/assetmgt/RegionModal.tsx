import React, { useState } from 'react';
import { Form, Input, InputNumber, Modal, Switch } from 'antd';
import { createAssetRegion } from '@/services/assets';

interface Props {
  onCancel: () => void;
  onCreated: () => void;
}

export default function RegionModal({ onCancel, onCreated }: Props) {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    let created = false;
    try {
      await createAssetRegion({ ...values, name: values.name.trim(), status: values.status ? 1 : 0 });
      created = true;
    } catch {
      // Request middleware displays backend validation errors; keep the form open.
    } finally {
      setSaving(false);
    }
    if (created) onCreated();
  };
  return (
    <Modal visible title='新增分组' onCancel={onCancel} onOk={handleSave} confirmLoading={saving} cancelButtonProps={{ disabled: saving }} closable={!saving} maskClosable={!saving} destroyOnClose>
      <Form form={form} labelCol={{ span: 5 }} wrapperCol={{ span: 18 }} initialValues={{ sort: 0, status: true }}>
        <Form.Item name='name' label='区域名称' rules={[{ required: true, whitespace: true, message: '请输入区域名称' }]}>
          <Input placeholder='请输入区域名称' />
        </Form.Item>
        <Form.Item name='sort' label='排序' rules={[{ required: true, message: '请输入排序' }]}>
          <InputNumber precision={0} />
        </Form.Item>
        <Form.Item name='status' label='启用' valuePropName='checked'>
          <Switch />
        </Form.Item>
        <Form.Item name='remark' label='备注'>
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
