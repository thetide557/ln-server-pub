import React from 'react';
import { useHistory } from 'react-router-dom';
import './index.less';

const quickAccessItems = [
  {
    title: '告警规则',
    path: '/alert-rules?id=-1',
    icon: '/public/image/portal/slide/图层 827@2x.png',
    background: '/public/image/portal/slide/图层 817@2x.png',
  },
  {
    title: '运维资产清单',
    path: '/xh/assetmgt',
    icon: '/public/image/portal/slide/图层 831@2x.png',
    background: '/public/image/portal/slide/图层 823@2x.png',
  },
  {
    title: '健康报告',
    path: '/healthReport',
    icon: '/public/image/portal/slide/图层 835@2x.png',
    background: '/public/image/portal/slide/图层 817@2x.png',
  },
  {
    title: '巡检管理',
    path: '/inspection/inspectionList',
    icon: '/public/image/portal/slide/图层 840@2x.png',
    background: '/public/image/portal/slide/图层 823@2x.png',
  },
  {
    title: '拓扑管理',
    path: '/bigscreen/topology',
    icon: '/public/image/portal/slide/图层 844@2x.png',
    background: '/public/image/portal/slide/图层 817@2x.png',
  },
  {
    title: '当前告警',
    path: '/alert-cur-events',
    icon: '/public/image/portal/slide/图层 848@2x.png',
    background: '/public/image/portal/slide/图层 823@2x.png',
  },
];

export default function QuickAccess() {
  const history = useHistory();

  return (
    <div className='portal-quick-access'>
      <div className='portal-panel-title'>高频功能入口</div>

      <div className='portal-quick-access-grid'>
        {quickAccessItems.map((item) => (
          <div
            key={item.title}
            className='portal-quick-access-card'
            style={{ backgroundImage: `url(${item.background})` }}
            onClick={() => history.push(item.path)}
          >
            <div className='portal-quick-access-title'>{item.title}</div>
            <img className='portal-quick-access-icon' src={item.icon} alt={item.title} />
          </div>
        ))}
      </div>
    </div>
  );
}
