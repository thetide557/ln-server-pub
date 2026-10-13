import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { enableU } from '@/services/assets/dc-overview';
import type { USlotModalBaseProps } from './types';

/** 启用 U 位弹窗（纯确认） */
const EnableModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetId, allSlots, onClose, onSuccess, reload }) => {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!slot) { onClose(); return; }
    // 找到禁用区段范围（一个禁用区段一起启用）
    const disabledReason = slot.disabled_reason;
    const matches = allSlots.filter((s) => s.status === 'disabled' && s.disabled_reason === disabledReason);
    const positions = matches.length > 0 ? matches.map((s) => s.u_position) : [slot.u_position];
    const startU = Math.min(...positions);
    const height = Math.max(...positions) - startU + 1;
    setSubmitting(true);
    try {
      // 6.12 启用 U 位（区间全为禁用态 → 格子回 FREE）
      const res = await enableU({
        cabinet_id: Number(cabinetId),
        start_u: startU,
        u_height: height,
      });
      if (res?.err) {
        message.error(res.err);
        return;
      }
      onSuccess(positions, {
        status: 'idle',
        disabled_reason: undefined,
        update_by: '当前用户',
      });
      message.success('启用成功');
      reload();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="启用提醒" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={440}>
      <div style={{ fontSize: 13, color: '#4E5969' }}>
        确认启用U位吗？启用后 U 位变为「空闲」，可分配资产使用。
      </div>
    </Modal>
  );
};

export default EnableModal;
