import React, { useState, useEffect, useContext } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Menu } from 'antd';
import {
  DashboardOutlined,
} from '@ant-design/icons';
import { CommonStateContext } from '@/App';
import { getMenuPerm } from '@/services/common';
import _ from 'lodash';
import { portalModules, PortalModule, PortalSubModule, PortalThirdModule } from '../../portal/config';
import './LeftSidebar.less';

interface LeftSidebarProps {
  currentModule?: PortalModule | null;
}

export default function LeftSidebar({ currentModule }: LeftSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [openKeys, setOpenKeys] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [filteredChildren, setFilteredChildren] = useState<PortalSubModule[]>([]);

  const history = useHistory();
  const location = useLocation();
  const { profile } = useContext(CommonStateContext);

  useEffect(() => {
    if (!currentModule) {
      setFilteredChildren([]);
      return;
    }

    if (profile?.roles?.length > 0 && profile?.roles.indexOf('Admin') === -1) {
      getMenuPerm().then((res) => {
        const { dat } = res;
        const children = currentModule.children.map((sub) => {
          if (sub.children && sub.children.length > 0) {
            const filteredThird = _.filter(sub.children, (third) => {
              return third.permKey && dat.includes(third.permKey);
            });
            if (filteredThird.length > 0) {
              return { ...sub, children: filteredThird };
            }
            return null;
          }
          return sub.permKey && dat.includes(sub.permKey) ? sub : null;
        }).filter(Boolean) as PortalSubModule[];
        setFilteredChildren(children);
      }).catch(() => {
        setFilteredChildren(currentModule.children);
      });
    } else {
      setFilteredChildren(currentModule.children);
    }
  }, [currentModule, profile?.roles]);

  useEffect(() => {
    if (!currentModule) {
      setOpenKeys([]);
      setSelectedKeys([]);
      return;
    }

    const currentPath = location.pathname;
    let found = false;
    filteredChildren.forEach((child, childIndex) => {
      const subKey = `${currentModule.id}-${childIndex}`;
      if (child.children) {
        child.children.forEach((third, thirdIndex) => {
          const thirdPath = third.path.split('?')[0];
          if (currentPath === thirdPath || currentPath.startsWith(thirdPath + '/')) {
            setOpenKeys([subKey]);
            setSelectedKeys([`${subKey}-${thirdIndex}`]);
            found = true;
          }
        });
      }
      if (found) return;
      const childPath = child.path.split('?')[0];
      if (currentPath === childPath || currentPath.startsWith(childPath + '/')) {
        if (child.children && child.children.length > 0) {
          setOpenKeys([subKey]);
        } else {
          setOpenKeys([]);
        }
        setSelectedKeys([subKey]);
        found = true;
      }
    });
    if (!found) {
      setSelectedKeys([]);
    }
  }, [location.pathname, filteredChildren, currentModule]);

  const handleMenuClick = ({ key }: { key: string }) => {
    if (!currentModule) return;

    const parts = key.split('-');
    if (parts.length === 2) {
      const childIndex = parseInt(parts[1]);
      if (filteredChildren[childIndex]) {
        const child = filteredChildren[childIndex];
        if (child.children && child.children.length > 0) {
          const subKey = `${currentModule.id}-${childIndex}`;
          setOpenKeys(openKeys.includes(subKey) ? openKeys.filter(k => k !== subKey) : [...openKeys, subKey]);
        } else {
          history.push(child.path);
        }
      }
    } else if (parts.length === 3) {
      const childIndex = parseInt(parts[1]);
      const thirdIndex = parseInt(parts[2]);
      if (filteredChildren[childIndex] && filteredChildren[childIndex].children?.[thirdIndex]) {
        const third = filteredChildren[childIndex].children[thirdIndex];
        history.push(third.path);
      }
    }
  };

  const renderThirdLevel = (childIndex: number, children: PortalThirdModule[]) => {
    if (!currentModule) return null;
    return children.map((third, thirdIndex) => (
      <Menu.Item
        key={`${currentModule.id}-${childIndex}-${thirdIndex}`}
        onClick={() => {
          history.push(third.path);
        }}
      >
        <span className="sidebar-third-level">{third.title}</span>
      </Menu.Item>
    ));
  };

  const renderMenuItems = () => {
    if (!currentModule || filteredChildren.length === 0) return null;

    return filteredChildren.map((child, childIndex) => {
      const hasThirdLevel = child.children && child.children.length > 0;
      const subKey = `${currentModule.id}-${childIndex}`;

      if (!hasThirdLevel) {
        return (
          <Menu.Item
            key={subKey}
            title={null}
            onClick={() => {
              history.push(child.path);
            }}
          >
            {child.icon || <DashboardOutlined />}
            <span>{child.title}</span>
          </Menu.Item>
        );
      }

      return (
        <Menu.SubMenu
          key={subKey}
          title={
            <span>
              {child.icon || <DashboardOutlined />}
              <span>{child.title}</span>
            </span>
          }
        >
          {renderThirdLevel(childIndex, child.children!)}
        </Menu.SubMenu>
      );
    });
  };

  if (!currentModule) return null;

  return (
    <aside className={`sidebar-container ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-header">
        <img src={currentModule.iconImage} alt={currentModule.title} className="sidebar-header-icon" />
        {!collapsed && <span className="sidebar-header-title">{currentModule.title}</span>}
        <img
          src={collapsed ? '/image/menu/expand.png' : '/image/menu/collapsed.png'}
          alt={collapsed ? '展开' : '收起'}
          className="sidebar-toggle"
          onClick={() => setCollapsed(!collapsed)}
        />
      </div>
      <div className="sidebar-content">
        <Menu
          mode="inline"
          inlineCollapsed={collapsed}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          selectedKeys={selectedKeys}
          onClick={handleMenuClick}
          className="sidebar-menu"
          theme="light"
        >
          {renderMenuItems()}
        </Menu>
      </div>
    </aside>
  );
}