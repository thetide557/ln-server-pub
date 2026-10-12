import React, { Fragment } from 'react';
import { ARCHS, REGIONS, formatChartNumber } from '../resourceAnalysisData';
import type { DetailCell, DetailRow } from '../resourceAnalysisData';

interface DetailTableProps {
  rows: DetailRow[];
  /** 导出模式：去掉 rowSpan，每行都显示资源类型，避免 PDF 切片换页后文字缺失 */
  flat?: boolean;
}

const USAGE_LABELS = ['总量', '已分配', '剩余', '分配率'];

const archLabel = (arch: string) => `${arch === 'C86' ? 'c86' : 'ARM'}资源`;

const cellText = (cell: DetailCell, rowIndex: number) => {
  if (!cell.exists) return '—';
  if (rowIndex === 3) return `${cell.rate.toFixed(2)}%`;
  if (rowIndex === 0) return formatChartNumber(cell.total);
  if (rowIndex === 1) return formatChartNumber(cell.allocated);
  return formatChartNumber(cell.rest);
};

/** 资源类型单元格 */
const TypeCell: React.FC<{ row: DetailRow; flat: boolean; showIcon: boolean }> = ({ row, flat, showIcon }) => {
  if (flat) {
    return (
      <td className='detail-cell-type detail-cell-type--flat'>
        {showIcon && <i style={{ background: row.color }} />}
        {row.label}
      </td>
    );
  }
  return (
    <td className='detail-cell-type' rowSpan={USAGE_LABELS.length}>
      <i style={{ background: row.color }} />
      {row.label}
    </td>
  );
};

/** 资源使用情况明细表（含云外部署） */
const DetailTable: React.FC<DetailTableProps> = ({ rows, flat = false }) => (
  <div className='detail-table-wrap'>
    <table className={`detail-table${flat ? ' detail-table--flat' : ''}`}>
      <thead>
        <tr>
          <th className='detail-col-type' rowSpan={2}>
            资源类型
          </th>
          <th className='detail-col-usage' rowSpan={2}>
            使用情况
          </th>
          {REGIONS.map((region) => (
            <th key={region} colSpan={ARCHS.length}>
              {region}
            </th>
          ))}
          <th className='detail-col-total' rowSpan={2}>
            总体合计
          </th>
        </tr>
        <tr>
          {REGIONS.reduce<JSX.Element[]>(
            (list, region) =>
              list.concat(
                ARCHS.map((arch) => (
                  <th key={`${region}-${arch}`} className='detail-col-arch'>
                    {archLabel(arch)}
                  </th>
                )),
              ),
            [],
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Fragment key={row.key}>
            {USAGE_LABELS.map((label, rowIndex) => (
              <tr key={label}>
                {(rowIndex === 0 || flat) && <TypeCell row={row} flat={flat} showIcon={rowIndex === 0} />}
                <td className='detail-cell-usage'>{`${label} (${row.unit})`}</td>
                {row.cells.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cellText(cell, rowIndex)}</td>
                ))}
                <td className='detail-cell-total'>{cellText(row.total, rowIndex)}</td>
              </tr>
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
    <p className='detail-note'>说明：区域与架构列为配额口径，总体合计为各区域架构的汇总；云外备份仅统计已采用云外部署的单位，未部署单位不计入。</p>
  </div>
);

export default DetailTable;
