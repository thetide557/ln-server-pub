import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import {disableU} from '@/services/assets/dc-overview';
import { type USlotModalBaseProps } from './types';

/** 禁用 U 位弹窗 */
const DisableModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetId, onClose, onSuccess, reload }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => { form.resetFields(); });
  }, [visible]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      // 6.11 禁用 U 位（只能禁用空闲 U 位）
      const res = await disableU({
        cabinet_id: Number(cabinetId),
        start_u: slot!.u_position,
        u_height: 1,
        reason: values.reason,
      });
      if (res?.err) {
        message.error(res.err);
        return;
      }
      onSuccess([slot!.u_position], {
        status: 'disabled',
        disabled_reason: values.reason,
        asset_name: undefined,
        asset_ip: undefined,
        asset_type: undefined,
        asset_model: undefined,
        occupy_u: undefined,
        update_by: '当前用户',
      });
      message.success('禁用成功');
      reload();
      onClose();
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="禁用提醒" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={480}>
      <div style={{ fontSize: 13, color: '#4E5969', marginBottom: 12 }}>
        禁用后 U 位变为「禁用」，将不可占用。
      </div>
      <Form form={form} preserve={false}>
        <Form.Item label="禁用说明" name="reason" rules={[{ required: true, message: '请输入禁用说明' }]}>
          <Input.TextArea rows={4} placeholder="请输入禁用原因" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DisableModal;
