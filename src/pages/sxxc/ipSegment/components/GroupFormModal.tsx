/**
 * 新增/编辑分组弹窗
 * 对应原型：新增分组弹框（*分组名称）
 */
import React, { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import { IpGroup } from '../types';

interface GroupFormModalProps {
  visible: boolean;
  /** 编辑时传入分组，新增时为空 */
  group?: IpGroup;
  /** 新增子分组时传入父分组名，展示归属 */
  parentGroupName?: string;
  onClose: () => void;
  onOk: (values: { name: string }) => Promise<void>;
}

export default function GroupFormModal(props: GroupFormModalProps) {
  const { visible, group } = props;
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      form.resetFields();
      if (group) {
        form.setFieldsValue({ name: group.name });
      }
    }
  }, [visible, group]);

  return (
    <Modal
      title={group ? '编辑分组' : '新增分组'}
      visible={visible}
      onCancel={props.onClose}
      onOk={async () => {
        const values = await form.validateFields();
        await props.onOk(values);
      }}
      destroyOnClose
    >
      <Form form={form} labelCol={{ flex: '90px' }}>
        {props.parentGroupName && !group && (
          <div style={{ marginBottom: 12, paddingLeft: 90 }}>归属：{props.parentGroupName}</div>
        )}
        <Form.Item
          label='分组名称'
          name='name'
          rules={[
            { required: true, message: '请输入分组名称' },
            { max: 20, message: '分组名称不能超过20个字符' },
          ]}
        >
          <Input placeholder='请输入分组名称' maxLength={20} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
