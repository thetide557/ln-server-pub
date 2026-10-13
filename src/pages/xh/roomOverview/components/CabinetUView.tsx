import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Empty, Spin, Tag, Button } from 'antd';
import { useHistory } from 'react-router-dom';
import { getCabinetUSlots } from '@/services/assets/dc-overview';
import type { CabinetUSlot } from '@/services/assets/dc-overview';
import {
  OccupyModal, ReserveModal, ReleaseModal,
  DisableModal, EnableModal, CancelReserveModal, MigrateModal,
} from './USlotModals';

type ModalType = null | 'occupy' | 'disable' | 'enable' | 'release' | 'cancelReserve' | 'reserve' | 'migrate';

// 状态颜色 & 样式（方格背景用带透明度的边框色，text 用于统计卡片数字颜色）
const STATUS_STYLES: Record<
  CabinetUSlot['status'],
  { bg: string; border: string; text: string; label: string }
> = {
  used:     { bg: 'rgba(114, 184, 250, 0.07)', border: '#72B8FA', text: '#1C76FD', label: '已占用' },
  idle:     { bg: '#FFFFFF',                   border: '#dbdbdb', text: '#08C261', label: '闲置'   },
  reserved: { bg: 'rgba(247, 159, 7, 0.08)',   border: '#F79F07', text: '#F79F07', label: '预留'   },
  fault:    { bg: 'rgba(245, 5, 5, 0.05)',     border: '#F50505', text: '#F50505', label: '故障'   },
  disabled: { bg: 'rgba(123, 123, 123, 0.14)', border: '#7B7B7B', text: '#7B7B7B', label: '禁用'   },
};

interface Props {
  cabinetId: number | string;
  cabinetCode: string;
  /** U 位变更（占用/释放/迁移等）后通知父级刷新设备统计 */
  onSlotsChange?: () => void;
}

/** 机柜 U 位视图 —— 统计卡 + 过滤器 + 方格可视化 + 右侧详情面板 */
const CabinetUView: React.FC<Props> = ({ cabinetId, cabinetCode, onSlotsChange }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<CabinetUSlot[]>([]);
  const [selected, setSelected] = useState<CabinetUSlot | null>(null);
  // 弹窗状态
  const [modalType, setModalType] = useState<ModalType>(null);
  const [currentSlot, setCurrentSlot] = useState<CabinetUSlot | null>(null);

  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCabinetUSlots(cabinetId, { cabinet_code: cabinetCode });
      setSlots(res?.dat || []);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }, [cabinetId, cabinetCode]);

  useEffect(() => {
    if (cabinetId) reload();
  }, [cabinetId]);

  // 统计
  const stats = useMemo(() => {
    const total = slots.length;
    const s = { used: 0, idle: 0, reserved: 0, fault: 0, disabled: 0 };
    slots.forEach((x) => { s[x.status]++; });
    const rate = total > 0 ? Math.round(((total - s.idle - s.disabled) / total) * 100) : 0;
    return { total, rate, ...s };
  }, [slots]);

  // 把连续同状态、同资产/同原因的 U 位合并为一个块（多 U 时只显示一次）
  const mergedSlots = useMemo(() => {
    const result: (CabinetUSlot | { merged: true; groupKey: string; start: number; end: number; count: number; slot: CabinetUSlot })[] = [];
    const seen = new Set<number>();
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (seen.has(s.u_position)) continue;
      // 可合并的状态：used（按资产名）、reserved（按预留原因）、disabled（按禁用原因）
      const isMergeable = s.status === 'used' || s.status === 'reserved' || s.status === 'disabled';
      if (!isMergeable) {
        result.push(s);
        continue;
      }
      // 合并 key：状态 + 资产名/原因
      const mergeKey = s.status === 'used'
        ? `used:${s.asset_name || ''}`
        : s.status === 'reserved'
          ? `reserved:${s.reserved_reason || ''}`
          : `disabled:${s.disabled_reason || ''}`;
      // 找连续同 key 的
      let j = i + 1;
      let count = 1;
      while (j < slots.length) {
        const next = slots[j];
        const nextKey = next.status === 'used'
          ? `used:${next.asset_name || ''}`
          : next.status === 'reserved'
            ? `reserved:${next.reserved_reason || ''}`
            : `disabled:${next.disabled_reason || ''}`;
        if (nextKey === mergeKey && next.u_position === s.u_position - count) {
          count++;
          seen.add(next.u_position);
          j++;
        } else {
          break;
        }
      }
      if (count > 1) {
        const minU = s.u_position - count + 1;
        const maxU = s.u_position;
        result.push({ merged: true, groupKey: `${mergeKey}-${s.u_position}`, start: maxU, end: minU, count, slot: s });
      } else {
        result.push(s);
      }
      seen.add(s.u_position);
    }
    return result;
  }, [slots]);

  // ========== 辅助：选中 U 位所属的完整范围（minU, maxU） ==========
  const getSelectedRange = (sel: CabinetUSlot) => {
    if (sel.status === 'idle') return { min: sel.u_position, max: sel.u_position, count: 1 };
    // 查找与 sel 连续同状态、同资产/同原因的所有 U 位
    const isMergeable = sel.status === 'used' || sel.status === 'reserved' || sel.status === 'disabled' || sel.status === 'fault';
    if (!isMergeable) return { min: sel.u_position, max: sel.u_position, count: 1 };
    const mergeKey = sel.status === 'used' || sel.status === 'fault'
      ? `used:${sel.asset_name || ''}`
      : sel.status === 'reserved'
        ? `reserved:${sel.reserved_reason || ''}`
        : `disabled:${sel.disabled_reason || ''}`;
    const matches = slots.filter((s) => {
      const k = s.status === 'used' || s.status === 'fault'
        ? `used:${s.asset_name || ''}`
        : s.status === 'reserved'
          ? `reserved:${s.reserved_reason || ''}`
          : s.status === 'disabled'
            ? `disabled:${s.disabled_reason || ''}`
            : '';
      return k === mergeKey;
    });
    const positions = matches.map((m) => m.u_position).sort((a, b) => a - b);
    // 确保连续
    let min = positions[0];
    let max = positions[0];
    for (const p of positions) {
      if (p === min - 1) min = p;
      else if (p === max + 1) max = p;
    }
    return { min, max, count: max - min + 1 };
  };

  // ========== 辅助：计算所有连续空闲段 ==========
  const idleSegments = useMemo(() => {
    const result: { min: number; max: number; count: number }[] = [];
    const sorted = slots.filter((s) => s.status === 'idle').map((s) => s.u_position).sort((a, b) => a - b);
    if (sorted.length === 0) return result;
    let start = sorted[0];
    let end = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === end + 1) {
        end = sorted[i];
      } else {
        result.push({ min: start, max: end, count: end - start + 1 });
        start = sorted[i];
        end = sorted[i];
      }
    }
    result.push({ min: start, max: end, count: end - start + 1 });
    return result;
  }, [slots]);

  // ========== 辅助：选中 U 位所在的空闲段 ==========
  const selectedIdleSegment = useMemo(() => {
    if (!selected || selected.status !== 'idle') return null;
    return idleSegments.find((seg) => selected.u_position >= seg.min && selected.u_position <= seg.max) || null;
  }, [selected, idleSegments]);

  // 点击 U 位
  const handleSlotClick = (s: CabinetUSlot) => {
    setSelected(s);
  };

  // ========== 弹窗 ==========

  const patchSlot = (uPositions: number[], patch: Partial<CabinetUSlot>) => {
    setSlots((prev) => prev.map((s) =>
      uPositions.includes(s.u_position) ? { ...s, ...patch } : s,
    ));
    // 如果当前选中的 U 位在 patch 范围内，同步更新 selected
    if (selected && uPositions.includes(selected.u_position)) {
      setSelected((prev) => prev ? { ...prev, ...patch } : prev);
    }
  };

  const openModal = (type: ModalType, slot: CabinetUSlot) => {
    setCurrentSlot(slot);
    setModalType(type);
  };

  const closeModal = () => {
    setModalType(null);
    setCurrentSlot(null);
  };

  const handleSuccess = (positions: number[], patch: Partial<CabinetUSlot>) => {
    patchSlot(positions, patch);
    // 通知父级刷新设备类型统计等信息卡
    onSlotsChange?.();
  };

  const modalProps = {
    slot: currentSlot,
    cabinetCode,
    cabinetId,
    allSlots: slots,
    onClose: closeModal,
    onSuccess: handleSuccess,
    reload,
  };

  return (
    <Spin spinning={loading}>
      {/* 顶部统计卡 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={8}>
          <div style={{
            background: '#fff', borderRadius: 6, padding: '14px 16px',
            border: '1px solid #E5E6EB', height: '100%',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 13, color: '#86909C' }}>U位使用率</div>
            <div style={{ fontSize: 28, fontWeight: 600, color: '#1C76FD', marginTop: 4 }}>
              {stats.rate}%
            </div>
          </div>
        </Col>
        {(['idle', 'reserved', 'fault', 'disabled'] as const).map((st) => (
          <Col span={4} key={st}>
            <div style={{
              background: '#fff',
              borderRadius: 6, padding: '14px 16px',
              border: '1px solid #E5E6EB',
              height: '100%',
              display: 'flex', flexDirection: 'column', justifyContent: 'center',
            }}>
              <div style={{ fontSize: 13, color: '#86909C' }}>
                {STATUS_STYLES[st].label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 600, color: STATUS_STYLES[st].text, marginTop: 4 }}>
                {stats[st]}U
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* 状态图例 */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 24 }}>
        {(['used', 'reserved', 'fault', 'disabled', 'idle'] as const).map((st) => (
          <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: 2,
              background: STATUS_STYLES[st].bg,
              border: `1px solid ${STATUS_STYLES[st].border}`,
            }} />
            <span style={{ fontSize: 13, color: '#4E5969' }}>{STATUS_STYLES[st].label}</span>
          </div>
        ))}
      </div>

      {/* 主体：左方格 + 右详情 */}
      <Row gutter={[16, 16]}>
        {/* 左：U 位方格 */}
        <Col span={12}>
          <div style={{
            background: '#fff', borderRadius: 6, border: '1px solid #E5E6EB',
            padding: '8px 12px', maxHeight: 520, overflowY: 'auto',
          }}>
            {mergedSlots.length === 0 ? (
              <Empty description="暂无 U 位数据" />
            ) : (
              mergedSlots.map((item, idx) => {
                if ('merged' in item) {
                  const s = item.slot;
                  const sty = STATUS_STYLES[s.status];
                  // start=max U, end=min U → 范围按小到大显示
                  return (
                    <div
                      key={item.groupKey}
                      onClick={() => handleSlotClick(s)}
                      title={`U${item.end} - U${item.start} · ${sty.label}`}
                      style={{
                        display: 'flex', alignItems: 'stretch', gap: 8,
                        marginBottom: 4, cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: 42, color: '#86909C', fontSize: 12, textAlign: 'right',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      }}>
                        <span>{item.start}U</span>
                        <span>{item.end}U</span>
                      </div>
                      <div style={{
                        flex: 1, background: sty.bg, border: `1px solid ${sty.border}`,
                        borderRadius: 3, padding: '6px 10px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        minHeight: 22 + item.count * 12,
                      }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {s.status === 'used' ? (s.asset_name || '-')
                              : s.status === 'reserved' ? '预留'
                              : '禁用'}
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                            {s.status === 'used' ? ` ${s.asset_ip || '-'} · ${item.end}U-${item.start}U`
                              : s.status === 'reserved' ? `${s.reserved_reason || '预留说明'} · ${item.end}U-${item.start}U`
                              : `${s.disabled_reason || '禁用说明'} · ${item.end}U-${item.start}U`}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: '#86909C' }}>{sty.label}</span>
                      </div>
                    </div>
                  );
                }
                const s = item as CabinetUSlot;
                const sty = STATUS_STYLES[s.status];
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSlotClick(s)}
                    title={s.status === 'idle' ? '点击占用' : sty.label}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      marginBottom: 4, cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 42, color: '#86909C', fontSize: 12, textAlign: 'right' }}>
                      {s.u_position}U
                    </div>
                    <div style={{
                      flex: 1, background: sty.bg, border: `1px solid ${sty.border}`,
                      borderRadius: 3, padding: '5px 10px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: s.status === 'used' || s.status === 'fault' ? 500 : 400 }}>
                          {s.status === 'idle' ? '闲置'
                            : s.status === 'reserved' ? '预留'
                            : s.status === 'disabled' ? '禁用'
                            : s.asset_name || '-'}
                        </div>
                        {s.status === 'used' && (
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                            {s.asset_ip || '-'} · {s.u_position}U
                          </div>
                        )}
                        {s.status === 'fault' && (
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                            {s.asset_ip || '-'} · {s.u_position}U
                          </div>
                        )}
                        {s.status === 'reserved' && (
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                            {s.reserved_reason || '预留说明'} · {s.u_position}U
                          </div>
                        )}
                        {s.status === 'disabled' && (
                          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>
                            {s.disabled_reason || '禁用说明'} · {s.u_position}U
                          </div>
                        )}
                      </div>
                      {s.status === 'idle' ? (
                        <span style={{ fontSize: 12, color: '#86909C' }}>点击占用</span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#86909C' }}>{sty.label}</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Col>

        {/* 右：选中 U 位详情面板 */}
        <Col span={12}>
          <div style={{
            background: '#fff', borderRadius: 6, border: '1px solid #E5E6EB',
            padding: 16, minHeight: 300,
          }}>
            {!selected ? (
              <div style={{ textAlign: 'center', marginTop: 60, color: '#86909C' }}>
                <div style={{ fontSize: 14 }}>请选择左侧机柜中的 U 位</div>
                <div style={{ fontSize: 12, marginTop: 12 }}>
                  点击已占用 U 位查看资产详情；点击空闲 U 位可直接发起占用。
                </div>
              </div>
            ) : (() => {
              const range = getSelectedRange(selected);
              const rangeLabel = range.count > 1 ? `${range.min}U-${range.max}U` : `${range.min}U`;

              // ==== 闲置 U 位 ====
              if (selected.status === 'idle' && selectedIdleSegment) {
                const seg = selectedIdleSegment;
                return (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>闲置U位</div>
                    <div style={{ fontSize: 28, fontWeight: 600, color: '#1D2129', marginBottom: 8 }}>
                      {selected.u_position}U
                    </div>
                    <Tag color="green" style={{ marginBottom: 12 }}>闲置</Tag>
                    <DetailRow label="连续空闲段" value={`${seg.min}U - ${seg.max}U（共${seg.count}U）`} />
                    <DetailRow label="可安装资产" value={`≤ ${seg.count}U 的设备`} />
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      <Button type="primary" style={{ background: '#1C76FD', borderColor: '#1C76FD' }} onClick={() => openModal('occupy', selected)}>占用</Button>
                      <Button style={{ borderColor: '#F79F07', color: '#F79F07' }} onClick={() => openModal('reserve', selected)}>设为预留</Button>
                    </div>
                  </div>
                );
              }

              // ==== 已占用 / 故障 U 位 ====
              if (selected.status === 'used' || selected.status === 'fault') {
                const isFault = selected.status === 'fault';
                return (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                      {isFault ? '故障U位' : '已占用U位'}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#1D2129', marginBottom: 8 }}>
                      {selected.asset_name || '-'}
                    </div>
                    <Tag color={isFault ? 'red' : 'blue'} style={{ marginBottom: 12 }}>
                      {isFault ? '故障' : '已占用'}
                    </Tag>
                    {isFault && (
                      <div style={{
                        background: '#FFF1F0', border: '1px solid #FFCCC7', borderRadius: 4,
                        padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#F50505',
                      }}>
                        该 U 位资产处于故障状态，建议排查、释放或更换设备。
                      </div>
                    )}
                    <DetailRow label="资产编号" value={selected.asset_id || '-'} />
                    <DetailRowPair
                      left={{ label: '资产类型', value: selected.asset_type || '-' }}
                      right={{ label: '资产型号', value: selected.asset_model || '-' }}
                    />
                    <DetailRow label="IP地址" value={selected.asset_ip || '-'} />
                    <DetailRowPair
                      left={{ label: '占用U位', value: rangeLabel }}
                      right={{ label: '责任人', value: selected.duty_person || '-' }}
                    />
                    <DetailRow label="更新时间" value={selected.update_time || '-'} />
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      <Button type="primary" style={{ background: '#1C76FD', borderColor: '#1C76FD' }} onClick={() => openModal('migrate', selected)}>迁移</Button>
                      <Button style={{ borderColor: '#F79F07', color: '#F79F07' }} onClick={() => openModal('release', selected)}>释放U位</Button>
                      <Button onClick={() => selected.asset_id && history.push(`/xh/assetmgt/add?mode=view&id=${selected.asset_id}&from=roomOverview`)}>查看资产详情</Button>
                    </div>
                  </div>
                );
              }

              // ==== 预留 U 位 ====
              if (selected.status === 'reserved') {
                return (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>预留U位</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#1D2129', marginBottom: 8 }}>预留</div>
                    <Tag color="orange" style={{ marginBottom: 12 }}>预留</Tag>
                    <DetailRow label="占用U位" value={rangeLabel} />
                    <DetailRow label="预留说明" value={selected.reserved_reason || '-'} />
                    <DetailRow label="责任人" value={selected.duty_person || '-'} />
                    <DetailRow label="更新时间" value={selected.update_time || '-'} />
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      <Button type="primary" style={{ background: '#1C76FD', borderColor: '#1C76FD' }} onClick={() => openModal('cancelReserve', selected)}>取消预留</Button>
                    </div>
                  </div>
                );
              }

              // ==== 禁用 U 位 ====
              if (selected.status === 'disabled') {
                return (
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>禁用U位</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#1D2129', marginBottom: 8 }}>禁用</div>
                    <Tag color="default" style={{ marginBottom: 12 }}>禁用</Tag>
                    <DetailRow label="禁用U位" value={rangeLabel} />
                    <DetailRow label="禁用说明" value={selected.disabled_reason || '-'} />
                    <DetailRow label="责任人" value={selected.duty_person || '-'} />
                    <DetailRow label="更新时间" value={selected.update_time || '-'} />
                    <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                      <Button type="primary" style={{ background: '#1C76FD', borderColor: '#1C76FD' }} onClick={() => openModal('enable', selected)}>启用</Button>
                    </div>
                  </div>
                );
              }

              return null;
            })()}
          </div>
        </Col>
      </Row>

      {/* ============ 共享弹窗 ============ */}
      <OccupyModal visible={modalType === 'occupy'} {...modalProps} />
      <ReserveModal visible={modalType === 'reserve'} {...modalProps} />
      <ReleaseModal visible={modalType === 'release'} {...modalProps} />
      <DisableModal visible={modalType === 'disable'} {...modalProps} />
      <EnableModal visible={modalType === 'enable'} {...modalProps} />
      <CancelReserveModal visible={modalType === 'cancelReserve'} {...modalProps} />
      <MigrateModal visible={modalType === 'migrate'} {...modalProps} />
    </Spin>
  );
};

const DetailRow: React.FC<{ label: string; value: string | number; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
  <div style={{ fontSize: 13, padding: '4px 0' }}>
    <span style={{ color: '#86909C' }}>{label}：</span>
    <span style={{ color: '#1D2129' }}>{value}</span>
  </div>
);

const DetailRowPair: React.FC<{ left: { label: string; value: string | number }; right: { label: string; value: string | number } }> = ({ left, right }) => (
  <div style={{ display: 'flex', gap: 16 }}>
    <div style={{ flex: 1, fontSize: 13, padding: '4px 0' }}>
      <span style={{ color: '#86909C' }}>{left.label}：</span>
      <span style={{ color: '#1D2129' }}>{left.value}</span>
    </div>
    <div style={{ flex: 1, fontSize: 13, padding: '4px 0' }}>
      <span style={{ color: '#86909C' }}>{right.label}：</span>
      <span style={{ color: '#1D2129' }}>{right.value}</span>
    </div>
  </div>
);

export default CabinetUView;
