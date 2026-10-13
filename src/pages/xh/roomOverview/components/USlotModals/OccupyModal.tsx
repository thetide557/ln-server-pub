import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { getBusiGroups } from '@/services/common';
import { getAssetsByGroup, occupyU, segmentCheck } from '@/services/assets/dc-overview';
import type { CabinetUSlot } from '@/services/assets/dc-overview';
import { FORM_LAYOUT, type USlotModalBaseProps } from './types';
import { validateContiguousIdle } from './helper';

/** 占用 U 位弹窗 */
const OccupyModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetCode, cabinetId, allSlots, onClose, onSuccess, reload }) => {
  const [form] = Form.useForm();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [assetOptions, setAssetOptions] = useState<{ label: string; value: number }[]>([]);
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: number; name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const stats = React.useMemo(() => {
    const s = { used: 0, idle: 0, reserved: 0, fault: 0, disabled: 0 };
    allSlots.forEach((x) => { s[x.status]++; });
    return s;
  }, [allSlots]);

  // 打开时加载业务组列表（6.15 说明 group_id 指 assets 表的业务分组）
  useEffect(() => {
    if (!visible) return;
    getBusiGroups().then((res: any) => {
      const list = res?.dat || [];
      setGroupOptions(list.map((g: any) => ({ label: g.name, value: g.id, name: g.name })));
    });
  }, [visible]);

  useEffect(() => {
    if (!visible || !slot) return;
    setAssetOptions([]);
    setResult(null);
    requestAnimationFrame(() => {
      form.resetFields();
      form.setFieldsValue({ startUp: `${slot.u_position}U`, endUp: '-' });
    });
  }, [visible, slot]);

  const onBusinessGroupChange = (bgId: number) => {
    const group = groupOptions.find((g) => g.value === bgId);
    setAssetOptions([]);
    form.setFieldsValue({ assetId: undefined });
    if (!group) return;
    // 6.15 业务组资产下拉：列出该业务组下未占用任何 U 位的资产
    getAssetsByGroup(bgId).then((res: any) => {
      if (res?.err) {
        message.error(res.err);
        return;
      }
      const list = res?.dat || [];
      setAssetOptions(list.map((a: any) => ({ label: a.name, value: a.id })));
    });
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      if (!result?.ok) { message.error('请先选择有效的连续 U 位段'); return; }
      const group = groupOptions.find((g) => g.value === values.businessGroupId);
      if (!group) { message.error('请选择所属业务组'); return; }
      setSubmitting(true);
      // 6.7 占用 U 位
      const res = await occupyU({
        cabinet_id: Number(cabinetId),
        monitoring_asset_id: values.assetId,
        business_group_name: group.name,
        start_u: slot!.u_position,
        u_height: values.height,
        owner_name: values.dutyPerson,
      });
      if (res?.err) {
        message.error(res.err);
        return;
      }
      const endPos = slot!.u_position + values.height - 1;
      const positions = Array.from({ length: values.height }, (_, i) => slot!.u_position + i);
      onSuccess(positions, {
        status: 'used',
        occupy_u: values.height,
        update_by: '当前用户',
      });
      message.success(`占用成功：U${slot!.u_position} - U${endPos}`);
      reload();
      onClose();
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="占用U位" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={560}>
      {slot && (
        <>
          <div style={{
            background: '#F2F7FF', border: '1px solid #BFDBFE', borderRadius: 4,
            padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#1C76FD',
          }}>
            当前机柜：{cabinetCode} · 已用 {allSlots.length - stats.idle}U · 空闲 {stats.idle}U
          </div>
          <Form form={form} {...FORM_LAYOUT} preserve={false}
            onValuesChange={(changed) => {
              if ('height' in changed && slot) {
                const h = changed.height as number | null;
                if (!h) { setResult(null); form.setFieldsValue({ endUp: '-' }); return; }
                form.setFieldsValue({ endUp: `${slot.u_position + h - 1}U` });
                // 6.14 后端区段可用性校验（红绿提示），本地校验兜底
                segmentCheck({ cabinet_id: Number(cabinetId), start_u: slot.u_position, u_height: h })
                  .then((res: any) => {
                    if (res?.err) {
                      const local = validateContiguousIdle(slot.u_position, h, allSlots);
                      setResult({ ok: local.ok, msg: local.msg });
                      return;
                    }
                    setResult({ ok: !!res?.dat?.available, msg: res?.dat?.reason || '' });
                  })
                  .catch(() => {
                    const local = validateContiguousIdle(slot.u_position, h, allSlots);
                    setResult({ ok: local.ok, msg: local.msg });
                  });
              }
            }}
          >
            <Form.Item label="所属业务组" name="businessGroupId" rules={[{ required: true, message: '请选择所属业务组' }]}>
              <Select showSearch placeholder="请选择" onChange={onBusinessGroupChange}
                options={groupOptions.map((g) => ({ label: g.label, value: g.value }))} />
            </Form.Item>
            <Form.Item label="选择资产" name="assetId" rules={[{ required: true, message: '请选择资产' }]}>
              <Select showSearch placeholder={assetOptions.length === 0 ? '请先选择所属业务组' : '请选择'} options={assetOptions} />
            </Form.Item>
            <Form.Item label="起始U位">
              <Input value={`${slot.u_position}U`} disabled />
            </Form.Item>
            <Form.Item label="占用高度" name="height" required className="occupy-height-item"
              help={result ? (
                <span style={{ color: result.ok ? '#52c41a' : '#FF4D4F' }}>
                  {result.ok ? '可用' : '不可用'}
                </span>
              ) : undefined}
            >
              <InputNumber min={1} max={allSlots.length} placeholder="请输入" style={{ width: '100%' }} addonAfter="U" />
            </Form.Item>
            <Form.Item label="结束U位" name="endUp">
              <Input disabled />
            </Form.Item>
            <Form.Item label="责任人" name="dutyPerson" rules={[{ required: true, message: '请输入责任人' }]}>
              <Input placeholder="请输入" />
            </Form.Item>
          </Form>
        </>
      )}
    </Modal>
  );
};

export default OccupyModal;
