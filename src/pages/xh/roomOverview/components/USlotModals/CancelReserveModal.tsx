import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { cancelReserveU } from '@/services/assets/dc-overview';
import type { USlotModalBaseProps } from './types';

/** 取消预留弹窗（纯确认） */
const CancelReserveModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetId, allSlots, onClose, onSuccess, reload }) => {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!slot) { onClose(); return; }
    // 找到预留区段起始 U（一个预留为一个区段，取该状态区段最小 U）
    const reservedPositions = allSlots
      .filter((s) => s.status === 'reserved' && s.reserved_reason === slot.reserved_reason)
      .map((s) => s.u_position);
    const startU = reservedPositions.length > 0 ? Math.min(...reservedPositions) : slot.u_position;
    setSubmitting(true);
    try {
      // 6.10 取消预留 U 位
      const res = await cancelReserveU({
        cabinet_id: Number(cabinetId),
        start_u: startU,
      });
      if (res?.err) {
        message.error(res.err);
        return;
      }
      onSuccess([slot.u_position], {
        status: 'idle',
        reserved_reason: undefined,
        update_by: '当前用户',
      });
      message.success('取消预留成功');
      reload();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="取消预留" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={440}>
      <div style={{ fontSize: 13, color: '#4E5969' }}>
        确认取消预留吗？取消后 U 位变为「空闲」，原预留数据保留于变更记录中。
      </div>
    </Modal>
  );
};

export default CancelReserveModal;
