import React from 'react';
import ChartCard from './ChartCard';
import { formatChartNumber } from '../resourceAnalysisData';
/** 分配进度数据项（rate 为 0-100 数值） */
export interface AllocationProgressDatum {
  key: string;
  label: string;
  rate: number;
  allocated: number;
  total: number;
  color: string;
}

interface AllocationProgressPanelProps {
  title?: string;
  data: AllocationProgressDatum[];
}

/** 存储 / 计算 分配进度列表 */
const AllocationProgressPanel: React.FC<AllocationProgressPanelProps> = ({ title = '存储分配进度', data }) => (
  <ChartCard title={title}>
    <ul className='progress-list'>
      {data.map((item) => (
        <li className='progress-item' key={item.key}>
          <div className='progress-item-head'>
            <span className='progress-item-label'>{item.label}</span>
            <span className='progress-item-rate' style={{ color: item.color }}>
              {item.rate.toFixed(1)}%
            </span>
          </div>
          <div className='progress-item-track'>
            <i style={{ width: `${Math.min(item.rate, 100)}%`, background: item.color }} />
          </div>
          <div className='progress-item-note'>
            已分配 {formatChartNumber(item.allocated)} / 总量 {formatChartNumber(item.total)}
          </div>
        </li>
      ))}
    </ul>
  </ChartCard>
);

export default AllocationProgressPanel;
