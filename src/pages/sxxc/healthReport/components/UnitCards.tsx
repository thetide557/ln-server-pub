import React from 'react';
import type { UnitCard } from '../resourceAnalysisData';

interface UnitCardsProps {
  data: UnitCard[];
}

const CHARGE_CLASS: Record<string, string> = { 商用: 'commercial', 试用: 'trial', 自用: 'self' };

const formatInteger = (value: number) => value.toLocaleString('en-US');

/** 上云单位资源明细卡片 */
const UnitCards: React.FC<UnitCardsProps> = ({ data }) => (
  <div className='unit-cards'>
    {data.map((card) => (
      <div className='unit-card' key={card.id}>
        <div className='unit-card-head'>
          <span className='unit-card-name'>{card.name}</span>
          <span className={`unit-card-tag unit-card-tag--${CHARGE_CLASS[card.chargeType] || 'self'}`}>{card.chargeType}</span>
        </div>
        <ul className='unit-card-metrics'>
          <li>
            <span>主机</span>
            <b>
              {formatInteger(card.hosts)} <small>台</small>
            </b>
          </li>
          <li>
            <span>CPU</span>
            <b>
              {formatInteger(card.cpu)} <small>核</small>
            </b>
          </li>
          <li>
            <span>内存</span>
            <b>
              {formatInteger(card.mem)} <small>GB</small>
            </b>
          </li>
          <li>
            <span>存储</span>
            <b>
              {formatInteger(card.storageGB)} <small>GB</small>
            </b>
          </li>
        </ul>
      </div>
    ))}
  </div>
);

export default UnitCards;
