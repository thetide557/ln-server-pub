import React, { useContext, useEffect, useState } from 'react';
import { Dropdown, Menu, message } from 'antd';
import {
  DownOutlined,
  DashboardOutlined,
  AlertOutlined,
  CloudOutlined,
  ToolOutlined,
  LineChartOutlined,
  ApartmentOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  UnorderedListOutlined,
  NodeIndexOutlined,
  BellOutlined,
} from '@ant-design/icons';
import moment from 'moment';
import { useHistory } from 'react-router-dom';
import { useLocalStorage } from 'react-use';
import { CommonStateContext, initTheme } from '@/App';
import { getMyPortrait } from '@/services/log_set';
import { downloadTemplet } from '@/services/menu';
import { Logout } from '@/services/login';
import { getDictDataListByType } from '@/services/system/dict';
import Cookies from 'js-cookie';
import _ from 'lodash';
import { portalModules } from './config';
import { useScale, getScaleWrapperStyle } from '@/utils/useScale';
import './index.less';

const moduleIconMap: Record<string, React.ReactNode> = {
  visual: <DashboardOutlined />,
  monitor: <AlertOutlined />,
  it: <CloudOutlined />,
  auto: <ToolOutlined />,
  operation: <LineChartOutlined />,
  analysis: <ApartmentOutlined />,
  security: <SafetyCertificateOutlined />,
};

const quickIconMap: Record<string, React.ReactNode> = {
  'alert-rule': <AlertOutlined />,
  asset: <UnorderedListOutlined />,
  health: <FileTextOutlined />,
  inspection: <ToolOutlined />,
  topology: <NodeIndexOutlined />,
  alarm: <BellOutlined />,
};

/**
 * 门户首页
 */
export default function Portal() {
  const history = useHistory();
  const { profile } = useContext(CommonStateContext);
  const [theme] = useLocalStorage<any>('platform_theme', initTheme);
  const [currentTime, setCurrentTime] = useState(moment().format('YYYY年MM月DD日 HH:mm:ss'));
  const [hoveredModuleId, setHoveredModuleId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>();
  const [safeUrl, setSafeUrl] = useState<string>();

  const scale = useScale();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(moment().format('YYYY年MM月DD日 HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    getMyPortrait().then((res) => {
      if (res.dat != null && res.dat !== '') {
        setImageUrl(_.cloneDeep(`/api/takin/${res.dat}?${Math.random()}`));
      }
    });
    getDictDataListByType('safety_certification').then((res) => {
      if (res.dat?.length > 0) {
        setSafeUrl(res.dat[0].dict_value);
      }
    });
    
  }, []);

  /** 导航到指定路径 */
  const navigateTo = (path: string) => {
    if (path === '__safety__') {
      if (!safeUrl) return message.error('请先在数据字典中配置安全认证');
      return window.open(safeUrl);
    }
    history.push(path);
  };

  const topRightMenu = (
    <Menu>
      <Menu.Item onClick={() => history.push('/account/profile/info')}>个人信息</Menu.Item>
      <Menu.Item
        onClick={() => {
          Logout().then((res) => {
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('access_token');
            localStorage.removeItem('curBusiId');
            localStorage.removeItem('card5Data');
            localStorage.removeItem('card7Data');
            localStorage.removeItem('userId');
            localStorage.removeItem('left_tissueId');
            localStorage.removeItem('left_parId');
            localStorage.removeItem('left_asset_type');
            window.location.href = res?.dat?.logout_url || '/login';
          });
        }}
      >
        退出登录
      </Menu.Item>
    </Menu>
  );



  return (
    <div className='portal-container'>
    <div className='portal-page' style={getScaleWrapperStyle(scale)}>
      {/* 顶部栏 */}
      <header className='portal-header'>
        <div className='portal-header-left'>{currentTime}</div>
        <div className='portal-header-center'>
          <img src='/public/image/portal/logo.png' alt='logo' className='portal-logo' />
        </div>
        <div className='portal-header-right'>
          {!profile.roles?.includes('临时用户') && !profile.temp_remaining_days && (
            <Dropdown
              overlay={
                <Menu>
                  <Menu.Item
                    onClick={() => {
                      const url = '/api/takin/xh/assets/download/manual';
                      const exportTitle = '操作手册';
                      downloadTemplet(url).then((res) => {
                        const blobUrl = window.URL.createObjectURL(
                          new Blob([res], { type: 'application/pdf' }),
                        );
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        const dlName = exportTitle + moment().format('YYYY-MM-DD') + '.pdf';
                        link.setAttribute('download', dlName);
                        document.body.appendChild(link);
                        link.click();
                      });
                    }}
                  >
                    <span>操作手册</span>
                  </Menu.Item>
                  <Menu.Item
                    onClick={() => {
                      const url = '/api/takin/xh/assets/download/version';
                      const exportTitle = '版本说明';
                      downloadTemplet(url).then((res) => {
                        const blobUrl = window.URL.createObjectURL(
                          new Blob([res], { type: 'application/pdf' }),
                        );
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        const dlName = exportTitle + moment().format('YYYY-MM-DD') + '.pdf';
                        link.setAttribute('download', dlName);
                        document.body.appendChild(link);
                        link.click();
                      });
                    }}
                  >
                    <span>版本说明</span>
                  </Menu.Item>
                </Menu>
              }
              trigger={['hover']}
              overlayClassName='portal-dropdown'
              className='portal-help'
            >
              <span className='portal-help-icon'>
                <img src="/public/image/portal/help.png" alt="帮助中心" />
              </span>
            </Dropdown>
          )}
          <Dropdown overlay={topRightMenu} trigger={['click']} overlayClassName='portal-dropdown'>
            <span className='portal-user'>
              <img src={imageUrl || '/image/avatar1.png'} alt='avatar' />
              <span>Hi, {profile.nickname || profile.username}</span>
              <DownOutlined />
            </span>
          </Dropdown>
        </div>
      </header>

      {/* 一级模块区域 */}
      <section className='portal-modules'>
        <div className='portal-modules-list'>
          {portalModules.map((module, index) => {
            const isHovered = hoveredModuleId === module.id;
            const arcOffsets = [0, -32, -50, -61, -50, -32, 0];
            const arcOffset = arcOffsets[index] || 0;
            return (
              <div
                key={module.id}
                className={`portal-module-card ${isHovered && module.children.length > 0 ? 'is-hovered' : ''}`}
                style={{ transform: `translateY(${arcOffset}px)` }}
                onMouseEnter={() => setHoveredModuleId(module.id)}
                onMouseLeave={() => setHoveredModuleId(null)}
              >
                {isHovered && module.children.length > 0 ? (
                  <div className='portal-sub-modules'>
                    {module.children.map((sub, subIndex) => (
                      <React.Fragment key={sub.path}>
                        <div
                          className='portal-sub-module-item'
                          onClick={() => navigateTo(sub.path)}
                        >
                          <span className='portal-sub-module-icon'>{moduleIconMap[module.icon]}</span>
                          <span className='portal-sub-module-title'>{sub.title}</span>
                        </div>
                        {subIndex < module.children.length - 1 && (
                          <img src='/public/image/portal/sub-module-line.png' alt='' className='portal-sub-module-divider' />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                ) : isHovered && module.children.length === 0 ? (
                  <>
                    <img src={module.hoverImage} alt={module.title} className='portal-module-icon' />
                    <img src={module.titleImage} alt={module.title} className='portal-module-title' />
                  </>
                ) : (
                  <>
                    <img src={module.iconImage} alt={module.title} className='portal-module-icon' />
                    <img src={module.titleImage} alt={module.title} className='portal-module-title' />
                  </>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 底部信息面板 */}
      <section className='portal-bottom'>
        {/* 运维监控总览 */}
        <div className='portal-panel portal-panel-overview'>
          <div className='portal-panel-title'>运维监控总览</div>
        </div>

        {/* 今日值班信息 */}
        <div className='portal-panel portal-panel-duty'>
          <div className='portal-panel-title'>今日值班信息</div>
        </div>

        {/* 高频功能入口 */}
        <div className='portal-panel portal-panel-quick'>
          <div className='portal-panel-title'>高频功能入口</div>
        </div>
      </section>
    </div>
    </div>
  );
}
