import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { getUserFunctionTop } from '@/services/sxxc/portal';
import { ASSET_MONITOR_SCREEN_TITLE, goAssetMonitorScreen } from '../../navigation';
import { portalModules } from '../../config';
import './index.less';

interface QuickAccessItem {
  title: string;
  path: string;
  icon: string;
  background: string;
}

const EMPTY_IMAGE = '/public/image/portal/slide/高频功能入口-暂无.png';

const quickAccessFallbackItems: QuickAccessItem[] = [
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

const iconMap: Record<string, string> = {
  告警规则: '/public/image/portal/slide/图层 827@2x.png',
  运维资产清单: '/public/image/portal/slide/图层 831@2x.png',
  健康报告: '/public/image/portal/slide/图层 835@2x.png',
  巡检管理: '/public/image/portal/slide/图层 840@2x.png',
  拓扑管理: '/public/image/portal/slide/图层 844@2x.png',
  当前告警: '/public/image/portal/slide/图层 848@2x.png',
  任务中心: '/public/image/portal/slide/图层 840@2x.png',
  大屏管理: '/public/image/portal/slide/图层 831@2x.png',
  工作台: '/public/image/portal/slide/图层 844@2x.png',
  资产管理: '/public/image/portal/slide/图层 831@2x.png',
  监控日志: '/public/image/portal/slide/图层 831@2x.png',
  工单管理: '/public/image/portal/slide/图层 827@2x.png',
};

const pathMap: Record<string, string> = {
  告警规则: '/alert-rules?id=-1',
  运维资产清单: '/xh/assetmgt',
  健康报告: '/healthReport',
  巡检管理: '/inspection/inspectionList',
  拓扑管理: '/bigscreen/topology',
  当前告警: '/alert-cur-events',
  任务中心: '/taskManage/taskManage',
  大屏管理: '/bigscreen',
  工作台: '/comingSoon',
  资产管理: '/xh/assetmgt',
  监控日志: '/log/explorer',
  工单管理: '/workOrder',
};

const backgrounds = [
  '/public/image/portal/slide/图层 817@2x.png',
  '/public/image/portal/slide/图层 823@2x.png',
];

const portalSubModuleMap = portalModules
  .flatMap((module) => module.children)
  .reduce<Record<string, { title: string; path: string }>>((result, item) => {
    [item.title, item.path, item.permKey].forEach((key) => {
      if (key) {
        result[key] = {
          title: item.title,
          path: item.path,
        };
      }
    });
    return result;
  }, {});

function readFirst(source: any, fields: string[]) {
  for (const field of fields) {
    const value = source?.[field];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function getResponseList(response: any) {
  const data = response?.dat || response?.data || response || {};
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.list)) return data.list;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.functions)) return data.functions;
  if (Array.isArray(data.functionList)) return data.functionList;
  if (Array.isArray(data.topFunctions)) return data.topFunctions;
  if (Array.isArray(data.menus)) return data.menus;
  return [];
}

function normalizeQuickAccessItems(response: any): QuickAccessItem[] {
  return getResponseList(response)
    .map((item: any, index: number) => {
      const rawTitle = readFirst(item, [
        'title',
        'name',
        'menuName',
        'functionName',
        'label',
        'menu_name',
        'function_name',
        'module_name',
        'moduleName',
        'resourceName',
      ]);
      const rawPath = readFirst(item, [
        'path',
        'url',
        'route',
        'router',
        'href',
        'menuPath',
        'menuUrl',
        'menu_url',
        'modulePath',
        'module_path',
        'moduleUrl',
        'module_url',
        'functionPath',
        'functionUrl',
      ]);
      const permKey = readFirst(item, ['permKey', 'perm_key', 'permission', 'permissionKey']);
      const matchedModule = portalSubModuleMap[rawTitle] || portalSubModuleMap[rawPath] || portalSubModuleMap[permKey];
      const title = rawTitle || matchedModule?.title;
      const path = rawPath || matchedModule?.path || pathMap[title];

      if (!title || !path) return null;

      return {
        title,
        path,
        icon: item?.icon || item?.iconUrl || item?.image || iconMap[title] || quickAccessFallbackItems[index % quickAccessFallbackItems.length].icon,
        background: item?.background || item?.bg || backgrounds[index % backgrounds.length],
      };
    })
    .filter((item): item is QuickAccessItem => Boolean(item));
}

export default function QuickAccess() {
  const history = useHistory();
  const [quickAccessItems, setQuickAccessItems] = useState<QuickAccessItem[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getUserFunctionTop()
      .then((res) => {
        if (!isMounted) return;
        setQuickAccessItems(normalizeQuickAccessItems(res));
        setHasLoaded(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setQuickAccessItems([]);
        setHasLoaded(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const hasQuickAccessItems = quickAccessItems.length > 0;
  const handleNavigate = (item: QuickAccessItem) => {
    if (item.title === ASSET_MONITOR_SCREEN_TITLE) {
      goAssetMonitorScreen();
      return;
    }

    if (/^https?:\/\//.test(item.path)) {
      window.open(item.path);
      return;
    }
    history.push(item.path);
  };

  return (
    <div className='portal-quick-access'>
      <div className='portal-section-header'>
        <span className='portal-section-title'>高频功能入口</span>
      </div>

      {hasQuickAccessItems ? (
        <div className='portal-quick-access-grid'>
          {quickAccessItems.map((item) => (
            <div
              key={`${item.title}-${item.path}`}
              className='portal-quick-access-card'
              style={{ backgroundImage: `url(${item.background})` }}
              onClick={() => handleNavigate(item)}
            >
              <div className='portal-quick-access-title'>{item.title}</div>
              <img className='portal-quick-access-icon' src={item.icon} alt={item.title} />
            </div>
          ))}
        </div>
      ) : hasLoaded ? (
        <div className='portal-quick-access-empty'>
          <img src={EMPTY_IMAGE} alt='暂无高频功能入口' />
        </div>
      ) : (
        <div className='portal-quick-access-loading' />
      )}
    </div>
  );
}
