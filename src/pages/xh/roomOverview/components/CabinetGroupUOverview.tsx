import React, { useEffect, useState } from 'react';
import { getCabinetUSlots } from '@/services/assets/dc-overview';
import type { CabinetUSlot } from '@/services/assets/dc-overview';

/** 状态配色（与 U 位视图 STATUS_STYLES 完全一致） */
const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  used:     { bg: 'rgba(114, 184, 250, 0.07)', border: '#72B8FA', text: '#1C76FD', label: '已占用' },
  idle:     { bg: '#FFFFFF',                   border: '#dbdbdb', text: '#08C261', label: '闲置'   },
  reserved: { bg: 'rgba(247, 159, 7, 0.08)',   border: '#F79F07', text: '#F79F07', label: '预留'   },
  fault:    { bg: 'rgba(245, 5, 5, 0.05)',     border: '#F50505', text: '#F50505', label: '故障'   },
  disabled: { bg: 'rgba(123, 123, 123, 0.14)', border: '#7B7B7B', text: '#7B7B7B', label: '禁用'   },
};

interface CabinetBrief {
  id: number | string;
  code: string;
  name?: string;
  custom_seq?: number;
}

interface CabinetUData {
  id: number | string;
  code: string;
  name: string;
  /** 按 u_position 升序排列的 U 位数据 */
  slots: { u_position: number; status: string }[];
}

interface Props {
  /** 机柜组 ID */
  groupId: number | string;
  /** 该机柜组下的机柜列表 */
  cabinets: CabinetBrief[];
}

/**
 * 机柜组下所有机柜的 U 位使用概览
 * 每个机柜上方显示名称+编号，左侧 U 位编号，右侧状态格子
 */
const CabinetGroupUOverview: React.FC<Props> = ({ groupId, cabinets }) => {
  const [cabinetData, setCabinetData] = useState<CabinetUData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cabinets.length) { setCabinetData([]); return; }
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled(
          cabinets.map((c) => getCabinetUSlots(c.id, { cabinet_code: c.code }).then((r) => r?.dat || [])),
        );
        if (!alive) return;
        const list: CabinetUData[] = [];
        results.forEach((r, i) => {
          if (r.status === 'fulfilled') {
            const slots: CabinetUSlot[] = r.value || [];
            const sorted = [...slots].sort((a, b) => b.u_position - a.u_position);
            list.push({
              id: cabinets[i].id,
              code: cabinets[i].code,
              name: cabinets[i].name || cabinets[i].code,
              slots: sorted.map((s) => ({ u_position: s.u_position, status: s.status })),
            });
          }
        });
        setCabinetData(list);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [groupId, cabinets]);

  if (loading) return <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>加载机柜 U 位数据...</div>;
  if (cabinetData.length === 0) return <div style={{ padding: 16, textAlign: 'center', color: '#999' }}>该机柜组下暂无机柜数据</div>;

  return (
    <div className="cabinet-u-overview-wrapper">
      {/* 共用状态图例 */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        {(['used', 'reserved', 'fault', 'disabled', 'idle'] as const).map((st) => (
          <span key={st} style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: 4,
            fontSize: 12,
            color: STATUS_STYLES[st].text,
            background: STATUS_STYLES[st].bg,
            border: `1px solid ${STATUS_STYLES[st].border}`,
            lineHeight: '20px',
          }}>{STATUS_STYLES[st].label}</span>
        ))}
      </div>

      {/* 机柜列 */}
      <div className="cabinet-u-overview">
        {cabinetData.map((cab) => (
          <div key={cab.id} className="cabinet-u-overview-column">
            {/* 机柜标题：名称 + 编号 */}
            <div className="cabinet-u-overview-header" title={`${cab.name} (${cab.code})`}>
              <span className="cabinet-u-overview-name">{cab.name}</span>
              <span className="cabinet-u-overview-code">{cab.code}</span>
            </div>
            {/* U 位列表：左侧编号 + 右侧状态格 */}
            <div className="cabinet-u-overview-list">
              {cab.slots.map((slot) => {
                const sty = STATUS_STYLES[slot.status] || STATUS_STYLES.idle;
                return (
                  <div key={slot.u_position} className="cabinet-u-overview-row">
                    {/* 左侧 U 位编号 */}
                    <div className="cabinet-u-overview-u-num">
                      {slot.u_position}U
                    </div>
                    {/* 右侧状态格子 */}
                    <div
                      className="cabinet-u-overview-cell"
                      style={{
                        background: sty.bg,
                        borderColor: sty.border,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CabinetGroupUOverview;
