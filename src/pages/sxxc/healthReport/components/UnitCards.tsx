import React from 'react';
import type { UnitDetailItem } from '@/services/sxxc/healthReport';

interface UnitCardsProps {
  data: UnitDetailItem[];
}

/** 服务类型 → 标签样式（"-" / 未知类型不展示标签） */
const CHARGE_CLASS: Record<string, string> = { 商用: 'commercial', 试用: 'trial' };

/** 截断到小数点后两位（不四舍五入），整数千分位，小数保留两位 */
const formatNumber = (value: number) => {
  const truncated = Math.floor(value * 100) / 100;
  return Number.isInteger(truncated)
    ? truncated.toLocaleString('en-US')
    : truncated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/** 上云单位资源明细卡片 */
const UnitCards: React.FC<UnitCardsProps> = ({ data }) => (
  <div className="unit-cards">
    {data.map((card) => {
      const tagClass = CHARGE_CLASS[card.serviceType];
      return (
        <div className="unit-card" key={card.name}>
          <div className="unit-card-head">
            <span className="unit-card-name">{card.name}</span>
            {tagClass && <span className={`unit-card-tag unit-card-tag--${tagClass}`}>{card.serviceType}</span>}
          </div>
          <ul className="unit-card-metrics">
            <li>
              <span>主机</span>
              <b>
                {formatNumber(card.hostCount)} <small>台</small>
              </b>
            </li>
            <li>
              <span>CPU</span>
              <b>
                {formatNumber(card.cpuCount)} <small>核</small>
              </b>
            </li>
            <li>
              <span>内存</span>
              <b>
                {formatNumber(card.memCount)} <small>GB</small>
              </b>
            </li>
            <li>
              <span>存储</span>
              <b>
                {formatNumber(card.storageCount)} <small>GB</small>
              </b>
            </li>
          </ul>
        </div>
      );
    })}
  </div>
);

export default UnitCards;
