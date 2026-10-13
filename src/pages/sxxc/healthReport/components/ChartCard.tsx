import React, { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  className?: string;
  children: ReactNode;
}

/** 深色图表卡片：左侧竖条标题 + 内容区 */
const ChartCard: React.FC<ChartCardProps> = ({ title, className, children }) => (
  <section className={className ? `report-card ${className}` : 'report-card'}>
    <h3 className='report-card-title'>{title}</h3>
    {children}
  </section>
);

export default ChartCard;
