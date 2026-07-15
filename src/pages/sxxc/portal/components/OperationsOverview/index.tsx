import React from 'react';
import './index.less';

const overviewStats = [
  { label: '资产在线率(%)', value: '100' },
  { label: '今日告警总数', value: '015' },
  { label: '工单办结率(%)', value: '095' },
];

const durationItems = [
  { value: '20', unit: '天' },
  { value: '20', unit: '小时' },
  { value: '20', unit: '分钟' },
];

function DigitGroup({ value }: { value: string }) {
  return (
    <div className='portal-overview-digits'>
      {value.split('').map((char, index) => (
        <span
          key={`${value}-${index}`}
          className={`portal-overview-digit ${char === '0' ? 'is-zero' : ''}`}
        >
          {char}
        </span>
      ))}
    </div>
  );
}

export default function OperationsOverview() {
  return (
    <div className='portal-overview'>
      <div className='portal-panel-title'>运维监控总览</div>

      <div className='portal-overview-runtime'>
        <div className='portal-overview-runtime-inner'>
          <span className='portal-overview-runtime-label'>平台运行时长</span>
          <div className='portal-overview-runtime-values'>
            {durationItems.map((item) => (
              <span key={item.unit} className='portal-overview-runtime-item'>
                <span className='portal-overview-runtime-number'>{item.value}</span>
                <span className='portal-overview-runtime-unit'>{item.unit}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className='portal-overview-metrics'>
        {overviewStats.map((item) => (
          <div key={item.label} className='portal-overview-metric'>
            <DigitGroup value={item.value} />
            <div className='portal-overview-metric-label'>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
