import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import { releaseU } from '@/services/assets/dc-overview';
import { type USlotModalBaseProps } from './types';
import { getAssetUPositions } from './helper';

/** 释放 U 位弹窗 */
const ReleaseModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetId, allSlots, onClose, onSuccess, reload }) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    requestAnimationFrame(() => { form.resetFields(); });
  }, [visible]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const positions = getAssetUPositions(slot!, allSlots);
      const startU = Math.min(...positions);
      setSubmitting(true);
      // 6.8 释放 U 位（按机柜+起始 U 定位生效占用区段）
      const res = await releaseU({
        cabinet_id: Number(cabinetId),
        start_u: startU,
        reason: values.reason,
      });
      if (res?.err) {
        message.error(res.err);
        return;
      }
      onSuccess(positions, {
        status: 'idle',
        asset_name: undefined,
        asset_ip: undefined,
        asset_type: undefined,
        asset_model: undefined,
        occupy_u: undefined,
        duty_person: undefined,
        update_by: '当前用户',
      });
      const endU = Math.max(...positions);
      message.success(positions.length > 1
        ? `释放成功：U${startU} - U${endU}（共 ${positions.length}U，备注：${values.reason}）`
        : `释放成功（备注：${values.reason}）`);
      reload();
      onClose();
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="释放U位" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={480}>
      <div style={{ fontSize: 13, color: '#4E5969', marginBottom: 12 }}>
        释放后 U 位变为「空闲」，原 U 位数据保留于变更记录中。
      </div>
      <Form form={form} preserve={false}>
        <Form.Item label="释放说明" name="reason" rules={[{ required: true, message: '请输入释放说明' }]}>
          <Input.TextArea rows={4} placeholder="请输入释放原因" maxLength={200} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ReleaseModal;
