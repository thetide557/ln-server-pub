import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Form, Input, InputNumber, Select, message } from 'antd';
import { migrateU, segmentCheck, getCabinetSummary } from '@/services/assets/dc-overview';
import { getRoomAll } from '@/services/assets/dc-room';
import { getCabinetGroupAll } from '@/services/assets/cabinet-group';
import { getCabinetAll } from '@/services/assets/dc-cabinet';
import { FORM_LAYOUT } from './types';
import type { USlotModalBaseProps } from './types';
import { getAssetUPositions } from './helper';

/** 迁移 U 位弹窗 */
const MigrateModal: React.FC<USlotModalBaseProps> = ({ visible, slot, cabinetCode, cabinetId, allSlots, onClose, onSuccess, reload }) => {
  const [form] = Form.useForm();
  const [srcResult, setSrcResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [targetResult, setTargetResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [migrateToSelfValue, setMigrateToSelfValue] = useState<string>('yes');
  const [submitting, setSubmitting] = useState(false);
  // 跨柜迁移级联选项：机房(/dc-room/all) → 机柜组(/dc-cabinet-group/all) → 机柜(/dc-cabinet/all)
  const [roomOptions, setRoomOptions] = useState<{ label: string; value: number }[]>([]);
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: number }[]>([]);
  const [cabinetOptions, setCabinetOptions] = useState<{ label: string; value: number }[]>([]);
  // all 接口原始数据缓存（各请求一次，之后按 id 本地联动过滤）
  const groupAllRef = useRef<any[]>([]);
  const cabinetAllRef = useRef<any[]>([]);
  const roomsLoadedRef = useRef(false);
  const [targetU, setTargetU] = useState(42);
  // 已选中的跨柜目标机柜（用于提示框展示：编号 · 已用U数 · 空闲U数），未选时为 null
  const [selectedTargetCabinet, setSelectedTargetCabinet] = useState<{ code: string; usedU: number; freeU: number } | null>(null);

  const stats = useMemo(() => {
    const s = { used: 0, idle: 0, reserved: 0, fault: 0, disabled: 0 };
    allSlots.forEach((x) => { s[x.status]++; });
    return s;
  }, [allSlots]);

  // 懒加载机房下拉（/dc-room/all）：仅当用户选择「迁移至本机柜=否」时才触发，避免同柜迁移多余请求
  const loadRooms = async () => {
    if (roomsLoadedRef.current) return;
    roomsLoadedRef.current = true;
    const res: any = await getRoomAll();
    if (res?.err) { roomsLoadedRef.current = false; return; }
    const rooms = res?.dat?.list || res?.dat || [];
    setRoomOptions(rooms.map((r: any) => ({ label: r.room_name, value: r.id })));
  };

  useEffect(() => {
    if (!visible || !slot) return;
    const positions = getAssetUPositions(slot, allSlots);
    const startPos = Math.min(...positions);
    // 占用高度优先取后端权威值 u_height（occupy_u），缺失时回退到本地聚合的 U 位数量
    const h = slot.occupy_u || positions.length;
    const endPos = startPos + h - 1;
    const asset = slot.asset_name
      ? `${slot.asset_name}${slot.asset_ip ? ' - ' + slot.asset_ip : ''}`
      : '-';
    setSrcResult({ ok: true, msg: `源 U 位段 U${startPos} - U${endPos}（共 ${h}U）` });
    setTargetResult(null);
    setMigrateToSelfValue('yes');
    setSelectedTargetCabinet(null);
    requestAnimationFrame(() => {
      form.resetFields();
      form.setFieldsValue({
        srcBusinessGroup: slot.business_group_name || '-',
        srcAsset: asset,
        srcStartUp: `${startPos}U`,
        srcHeight: `${h}U`,
        srcEndUp: `${endPos}U`,
        dutyPerson: slot.duty_person || '',
        migrateToSelf: 'yes',
      });
    });
  }, [visible, slot]);

  // 选择机房 → 拉机柜组（/dc-cabinet-group/all）并按 room_id 本地联动
  const onRoomChange = async (roomId: number) => {
    form.setFieldsValue({ migrateGroup: undefined, migrateCabinet: undefined, targetStartUp: null, targetHeight: null, targetEndUp: null });
    setCabinetOptions([]);
    setTargetU(42);
    setTargetResult(null);
    setSelectedTargetCabinet(null);
    if (!groupAllRef.current.length) {
      const res: any = await getCabinetGroupAll();
      if (!res?.err) groupAllRef.current = res?.dat?.list || res?.dat || [];
    }
    setGroupOptions(
      groupAllRef.current
        .filter((g: any) => String(g.room_id) === String(roomId))
        .map((g: any) => ({ label: g.group_code, value: g.id })),
    );
  };

  // 选择机柜组 → 拉机柜（/dc-cabinet/all）并按 group_id 本地联动
  const onGroupChange = async (groupId: number) => {
    form.setFieldsValue({ migrateCabinet: undefined, targetStartUp: null, targetHeight: null, targetEndUp: null });
    setTargetU(42);
    setTargetResult(null);
    setSelectedTargetCabinet(null);
    if (!cabinetAllRef.current.length) {
      const res: any = await getCabinetAll();
      if (!res?.err) cabinetAllRef.current = res?.dat?.list || res?.dat || [];
    }
    setCabinetOptions(
      cabinetAllRef.current
        .filter((c: any) => String(c.group_id) === String(groupId))
        .map((c: any) => ({ label: c.cabinet_name || c.cabinet_code, value: c.id })),
    );
  };

  // 选择机柜 → 记录目标机柜 U 数，并拉信息卡获取已用/空闲 U 数用于提示
  const onCabinetChange = async (cabId: number) => {
    const cab = cabinetAllRef.current.find((c: any) => String(c.id) === String(cabId));
    setTargetU(cab?.u_capacity || 42);
    setSelectedTargetCabinet(null);
    if (!cab) return;
    const cabCode = cab.cabinet_code || cab.cabinet_name || '';
    const res: any = await getCabinetSummary(cabId);
    if (res?.err) return;
    const d = res?.dat || {};
    setSelectedTargetCabinet({
      code: d.cabinet_code || cabCode,
      usedU: d.occupied_u ?? 0,
      freeU: d.free_u ?? 0,
    });
  };

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const positions = getAssetUPositions(slot!, allSlots);
      const srcStartU = Math.min(...positions);
      setSubmitting(true);
      // 6.13 迁移 U 位（target_cabinet_id 不传 = 同柜迁移）
      const res = await migrateU({
        cabinet_id: Number(cabinetId),
        start_u: srcStartU,
        ...(values.migrateToSelf === 'no' && values.migrateCabinet ? { target_cabinet_id: values.migrateCabinet } : {}),
        target_start_u: values.targetStartUp,
        target_u_height: values.targetHeight,
        owner_name: values.dutyPerson,
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
        reserved_reason: undefined,
        disabled_reason: undefined,
        update_by: '当前用户',
      });
      message.success(`迁移成功（迁移说明：${values.reason}）`);
      reload();
      onClose();
    } catch { /* noop */ } finally {
      setSubmitting(false);
    }
  };

  const isSelf = migrateToSelfValue !== 'no';
  const maxU = isSelf ? allSlots.length : targetU;

  return (
    <Modal title="迁移U位" visible={visible} onCancel={onClose} onOk={submit} confirmLoading={submitting}
      okText="确定" cancelText="取消" destroyOnClose width={600}>
      {slot && (
        <Form form={form} {...FORM_LAYOUT} preserve={false}
          onValuesChange={(changed) => {
            if ('migrateToSelf' in changed) {
              const newVal = changed.migrateToSelf as string;
              setMigrateToSelfValue(newVal);
              form.setFieldsValue({ targetStartUp: null, targetHeight: null, targetEndUp: null });
              setTargetResult(null);
              // 切换为跨柜迁移时才懒加载机房下拉
              if (newVal === 'no') loadRooms();
            }

            const startPos = form.getFieldValue('targetStartUp') as number | null;
            const h = form.getFieldValue('targetHeight') as number | null;
            // 起始U位与占用高度均由用户输入；只要填了起始U位即可校验可用性
            // （高度未填时按 1U 校验起点单点，高度填了再按完整区段校验）
            if (startPos) {
              const effH = h || 1;
              form.setFieldsValue({ targetEndUp: h ? `${startPos + h - 1}U` : null });
              // 6.14 区段可用性校验（同柜时才有本地/后端数据；跨柜查目标机柜）
              const targetCabId = form.getFieldValue('migrateToSelf') !== 'no'
                ? Number(cabinetId)
                : (form.getFieldValue('migrateCabinet') as number | undefined);
              if (targetCabId) {
                segmentCheck({ cabinet_id: targetCabId, start_u: startPos, u_height: effH })
                  .then((res: any) => {
                    if (res?.err) {
                      setTargetResult({ ok: false, msg: res.err });
                      return;
                    }
                    setTargetResult({ ok: !!res?.dat?.available, msg: res?.dat?.reason || '' });
                  })
                  .catch(() => setTargetResult(null));
              } else {
                const curSlotList = isSelf
                  ? allSlots
                  : (targetCabId ? Array.from({ length: targetU }, (_, i) => ({ u_position: i + 1, status: 'idle' as const })) : null);
                if (curSlotList) {
                  const s = curSlotList.find((x) => x.u_position === startPos);
                  setTargetResult(
                    s && s.status === 'idle'
                      ? { ok: true, msg: `起点 U${startPos} 可用` }
                      : { ok: false, msg: `起点 U${startPos} 不可用` },
                  );
                }
              }
            } else {
              form.setFieldsValue({ targetEndUp: null });
              setTargetResult(null);
            }
          }}
        >
          <Form.Item label="所属业务组" name="srcBusinessGroup"><Input disabled /></Form.Item>
          <Form.Item label="选择资产" name="srcAsset"><Input disabled /></Form.Item>
          <Form.Item label="起始U位" name="srcStartUp"><Input disabled /></Form.Item>
          <Form.Item label="占用高度" name="srcHeight"><Input disabled /></Form.Item>
          <Form.Item label="结束U位" name="srcEndUp"><Input disabled /></Form.Item>
          <Form.Item label="责任人" name="dutyPerson" rules={[{ required: true, message: '请输入责任人' }]}>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item label="是否迁移至本机柜" name="migrateToSelf" rules={[{ required: true, message: '请选择' }]}>
            <Select options={[{ label: '是', value: 'yes' }, { label: '否', value: 'no' }]} />
          </Form.Item>

          <div style={{
            background: '#F2F7FF', border: '1px solid #BFDBFE', borderRadius: 4,
            padding: '10px 14px', marginBottom: 16, marginTop: 16,
            fontSize: 13, color: '#1C76FD',
          }}>
            {isSelf
              ? `当前机柜：${cabinetCode} · 已用 ${allSlots.length - stats.idle}U · 空闲 ${stats.idle}U`
              : (selectedTargetCabinet
                ? `迁移机柜：${selectedTargetCabinet.code} · 已用 ${selectedTargetCabinet.usedU}U · 空闲 ${selectedTargetCabinet.freeU}U`
                : '迁移机柜：请选择机房 → 机柜组 → 机柜')}
          </div>

          {!isSelf && (
            <>
              <Form.Item label="迁移机房" name="migrateRoom" rules={[{ required: true, message: '请选择迁移机房' }]}>
                <Select showSearch placeholder="请选择" options={roomOptions} onChange={onRoomChange} />
              </Form.Item>
              <Form.Item label="迁移机柜组" name="migrateGroup" rules={[{ required: true, message: '请选择迁移机柜组' }]}>
                <Select showSearch placeholder="请选择" options={groupOptions} onChange={onGroupChange} />
              </Form.Item>
              <Form.Item label="迁移机柜" name="migrateCabinet" rules={[{ required: true, message: '请选择迁移机柜' }]}>
                <Select showSearch placeholder="请选择" options={cabinetOptions} onChange={onCabinetChange} />
              </Form.Item>
            </>
          )}

          <Form.Item label="起始U位" name="targetStartUp" rules={[{ required: true, message: '请输入起始U位' }]}
            className="occupy-height-item"
            help={targetResult ? (
              <span style={{ color: targetResult.ok ? '#52c41a' : '#FF4D4F' }}>
                {targetResult.ok ? '可用' : '不可用'}
              </span>
            ) : undefined}
          >
            <InputNumber min={1} max={maxU} placeholder="请输入" style={{ width: '100%' }} addonAfter="U" />
          </Form.Item>
          <Form.Item label="占用高度" name="targetHeight"
            className="occupy-height-item"
            rules={[{ required: true, message: '请输入占用高度' }]}
          >
            <InputNumber min={1} max={maxU} placeholder="请输入" style={{ width: '100%' }} addonAfter="U" />
          </Form.Item>
          <Form.Item label="结束U位" name="targetEndUp"><Input disabled placeholder="-" /></Form.Item>
          <Form.Item label="迁移说明" name="reason" rules={[{ required: true, message: '请输入迁移说明' }, { max: 100, message: '最多 100 字' }]}>
            <Input.TextArea rows={3} placeholder="请输入迁移说明" maxLength={100} showCount />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default MigrateModal;
