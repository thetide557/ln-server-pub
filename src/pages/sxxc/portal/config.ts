export interface PortalSubModule {
  title: string;
  path: string;
  icon?: string;
}

export interface PortalModule {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconImage: string;
  titleImage: string;
  hoverImage?: string;
  children: PortalSubModule[];
}

/** 一级模块及二级模块配置 */
export const portalModules: PortalModule[] = [
  {
    id: 'visual',
    title: '可视化中心',
    subtitle: 'Visualization Center',
    icon: 'visual',
    iconImage: '/public/image/portal/1.png',
    titleImage: '/public/image/portal/title1.png',
    children: [
      { title: '资产监控大屏', path: '/screenView' },
      { title: '运维态势大屏', path: '/screenView' },
      { title: '运维报告自助', path: '/comingSoon' },
    ],
  },
  {
    id: 'monitor',
    title: '监控预警中心',
    subtitle: 'Monitoring and Early Warning Center',
    icon: 'monitor',
    iconImage: '/public/image/portal/2.png',
    titleImage: '/public/image/portal/title2.png',
    children: [
      { title: '实时监控看板', path: '/metric/explorer' },
      { title: '指标管理', path: '/xh/monitor' },
      { title: '即时查询', path: '/metric/explorer' },
      { title: '告警规则', path: '/alert-rules?id=-1' },
      { title: '当前告警', path: '/alert-cur-events' },
      { title: '历史告警', path: '/alert-his-events' },
    ],
  },
  {
    id: 'it',
    title: 'IT服务管理中心',
    subtitle: 'IT Service Management Center',
    icon: 'it',
    iconImage: '/public/image/portal/3.png',
    titleImage: '/public/image/portal/title3.png',
    children: [
      { title: '服务台', path: '/comingSoon' },
      { title: '工作台', path: '/comingSoon' },
      { title: '工单管理', path: '/workOrder' },
      { title: 'SLA管理', path: '/comingSoon' },
      { title: '任务协同', path: '/comingSoon' },
      { title: '值班管理', path: '/comingSoon' },
      { title: '知识管理', path: '/duty' },
      { title: '工单配置', path: '/workOrder' },
      { title: '供应商管理', path: '/comingSoon' },
      { title: '作业计划', path: '/productionplan' },
    ],
  },
  {
    id: 'auto',
    title: '自动化操作中心',
    subtitle: 'Automated Operations Center',
    icon: 'auto',
    iconImage: '/public/image/portal/4.png',
    titleImage: '/public/image/portal/title4.png',
    children: [
      { title: '任务中心', path: '/taskManage/taskManage' },
      { title: '自愈管理', path: '/job-tpls' },
      { title: '巡检中心', path: '/inspection/inspectionList' },
    ],
  },
  {
    id: 'analysis',
    title: '运营服务中心',
    subtitle: 'Operation Center',
    icon: 'analysis',
    iconImage: '/public/image/portal/5.png',
    titleImage: '/public/image/portal/title5.png',
    children: [
      { title: '资产管理', path: '/xh/assetmgt' },
      { title: 'CMDB', path: '/comingSoon' },
      { title: '拓扑管理', path: '/bigscreen/topology' },
      { title: '大屏管理', path: '/bigscreen' },
      { title: '组织管理', path: '/user-groups' },
      { title: '系统配置', path: '/help' },
      { title: '日志分析', path: '/log/operlog' },
      { title: '许可管理', path: '/license/base' },
      { title: '报表统计', path: '/comingSoon' },
    ],
  },
  {
    id: 'operation',
    title: '智能分析中心',
    subtitle: 'Analysis Center',
    icon: 'operation',
    iconImage: '/public/image/portal/6.png',
    titleImage: '/public/image/portal/title6.png',
    children: [
      { title: '监控日志', path: '/log/explorer' },
      { title: '趋势分析', path: '/comingSoon' },
      { title: '智能问答', path: '/aiRobot' },
      { title: '故障分析', path: '/comingSoon' },
    ],
  },
  {
    id: 'security',
    title: '安全中心',
    subtitle: 'Safety Center',
    icon: 'security',
    iconImage: '/public/image/portal/7.png',
    titleImage: '/public/image/portal/title7.png',
    hoverImage: '/public/image/portal/7-1.png',
    children: [
    ],
  },
];

