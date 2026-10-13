import React from 'react';
import type { DetailCellItem, DetailResourceItem } from '@/services/sxxc/healthReport';

/** 资源类型色条配色（key → 颜色），未识别的 key 走兜底色 */
const TYPE_COLORS: Record<string, string> = {
  vcpu: '#1668dc',
  memory: '#5b3fa8',
  standardStorage: '#0e8f82',
  ssd: '#d9822b',
  objectStorage: '#7e4ce0',
};
const FALLBACK_COLOR = '#5a6a80';

/** 使用情况的四个指标列（列头） */
const METRIC_LABELS = ['总量', '已分配', '剩余', '分配率'] as const;

/** 分组缺失时的占位单元格（后端约定 "-" 原样展示） */
const EMPTY_CELL: DetailCellItem = { total: '-', allocated: '-', remaining: '-', allocationRate: '-' };

interface DetailTableProps {
  items: DetailResourceItem[];
}

/**
 * 资源使用情况明细表：总体合计 + 各分组（专网C86 / 专网ARM / 互网C86 / 互网ARM）。
 * 所有单元格均为后端返回的字符串，原样渲染（"-" 不转数字、不替换文案）；
 * 每个资源一行、无 rowSpan，PDF 切片换页不会丢内容。
 */
const DetailTable: React.FC<DetailTableProps> = ({ items }) => {
  // 分组列头取自首个带分组的资源行（后端各行的分组结构一致）
  const groupNames = items.find((item) => item.groups.length > 0)?.groups.map((group) => group.name) ?? [];
  const groupCount = Math.max(
    groupNames.length,
    items.reduce((max, item) => Math.max(max, item.groups.length), 0),
  );

  return (
    <div className="detail-table-wrap">
      <table className="detail-table">
        <thead>
          <tr>
            <th className="detail-col-type" rowSpan={3}>
              资源类型
            </th>
            <th colSpan={4 + groupCount * 4}>使用情况</th>
          </tr>
          <tr>
            <th className="detail-col-total" colSpan={4}>
              总体合计
            </th>
            {Array.from({ length: groupCount }, (_, index) => (
              <th key={groupNames[index] || index} colSpan={4}>
                {groupNames[index] || '—'}
              </th>
            ))}
          </tr>
          <tr>
            {Array.from({ length: groupCount + 1 }, (_, groupIndex) =>
              METRIC_LABELS.map((label) => <th key={`${groupIndex}-${label}`}>{label}</th>),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const cells: DetailCellItem[] = [
              { total: item.total, allocated: item.allocated, remaining: item.remaining, allocationRate: item.allocationRate },
              ...item.groups,
            ];
            const color = TYPE_COLORS[item.key] || FALLBACK_COLOR;
            return (
              <tr key={item.key}>
                <td className="detail-cell-type">
                  <i style={{ background: color }} />
                  {item.name}
                </td>
                {Array.from({ length: groupCount + 1 }, (_, groupIndex) => {
                  const cell = cells[groupIndex] ?? EMPTY_CELL;
                  const totalClass = groupIndex === 0 ? ' detail-cell-total' : '';
                  return (
                    <React.Fragment key={groupIndex}>
                      <td className={totalClass.trim() || undefined}>{cell.total}</td>
                      <td className={totalClass.trim() || undefined}>{cell.allocated}</td>
                      <td className={totalClass.trim() || undefined}>{cell.remaining}</td>
                      <td className={totalClass.trim() || undefined}>{cell.allocationRate}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="detail-note">说明：明细数据为所选查询时刻的瞬时快照，"-" 表示该维度暂无数据。</p>
    </div>
  );
};

export default DetailTable;
