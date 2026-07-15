import React from 'react';
import {
  FileTextOutlined,
  DashboardOutlined,
  LineChartOutlined,
  SearchOutlined,
  AlertOutlined,
  BellOutlined,
  HistoryOutlined,
  CustomerServiceOutlined,
  LaptopOutlined,
  UnorderedListOutlined,
  ScheduleOutlined,
  TeamOutlined,
  CalendarOutlined,
  BookOutlined,
  SettingOutlined,
  ShopOutlined,
  ProjectOutlined,
  ToolOutlined,
  ScanOutlined,
  DatabaseOutlined,
  AppstoreOutlined,
  NodeIndexOutlined,
  FundOutlined,
  BarChartOutlined,
  SafetyCertificateOutlined,
  RobotOutlined,
  BugOutlined,
  FundProjectionScreenOutlined,
} from '@ant-design/icons';

export interface PortalSubModule {
  title: string;
  path: string;
  icon?: React.ReactNode;
  permKey?: string;
}

export interface PortalModule {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconImage: string;
  titleImage: string;
  hoverImage?: string;
  permKey?: string;
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
    permKey: '/center/visualization',
    children: [
      { title: '资产监控大屏', path: '/screenView', icon: <FundOutlined />, permKey: '/center/visualization/asset-monitor-screen' },
      { title: '运维态势大屏', path: '/screenView', icon: <FundProjectionScreenOutlined />, permKey: '/center/visualization/ops-situation-screen' },
      { title: '运维报告自助', path: '/healthReport', icon: <FileTextOutlined />, permKey: '/healthReport' },
    ],
  },
  {
    id: 'monitor',
    title: '监控预警中心',
    subtitle: 'Monitoring and Early Warning Center',
    icon: 'monitor',
    iconImage: '/public/image/portal/2.png',
    titleImage: '/public/image/portal/title2.png',
    permKey: '/center/monitor-alert',
    children: [
      { title: '实时监控看板', path: '/home', icon: <DashboardOutlined />, permKey: '/center/monitor-alert/realtime-dashboard' },
      { title: '指标管理', path: '/xh/monitor', icon: <LineChartOutlined />, permKey: '/xh/monitor' },
      { title: '即时查询', path: '/metric/explorer', icon: <SearchOutlined />, permKey: '/metric/explorer' },
      { title: '告警规则', path: '/alert-rules?id=-1', icon: <AlertOutlined />, permKey: '/alert-rules?id=-1' },
      { title: '当前告警', path: '/alert-cur-events', icon: <BellOutlined />, permKey: '/alert-cur-events' },
      { title: '历史告警', path: '/alert-his-events', icon: <HistoryOutlined />, permKey: '/alert-his-events' },
    ],
  },
  {
    id: 'it',
    title: 'IT服务管理中心',
    subtitle: 'IT Service Management Center',
    icon: 'it',
    iconImage: '/public/image/portal/3.png',
    titleImage: '/public/image/portal/title3.png',
    permKey: '/center/itsm',
    children: [
      { title: '服务台', path: '/comingSoon', icon: <CustomerServiceOutlined />, permKey: '/center/itsm/service-desk' },
      { title: '工作台', path: '/comingSoon', icon: <LaptopOutlined />, permKey: '/center/itsm/workbench' },
      { title: '工单管理', path: '/workOrder', icon: <UnorderedListOutlined />, permKey: '/workOrder' },
      { title: 'SLA管理', path: '/comingSoon', icon: <ScheduleOutlined />, permKey: '/center/itsm/sla' },
      { title: '任务协同', path: '/comingSoon', icon: <TeamOutlined />, permKey: '/center/itsm/task-collaboration' },
      { title: '值班管理', path: '/sxxc/dutyManage', icon: <CalendarOutlined />, permKey: '/center/itsm/duty' },
      { title: '知识管理', path: '/comingSoon', icon: <BookOutlined />, permKey: '/center/itsm/knowledge' },
      { title: '工单配置', path: '/workOrder', icon: <SettingOutlined />, permKey: '/center/itsm/work-order-config' },
      { title: '供应商管理', path: '/comingSoon', icon: <ShopOutlined />, permKey: '/center/itsm/supplier' },
      { title: '作业计划', path: '/comingSoon', icon: <ScheduleOutlined />, permKey: '/center/itsm/operation-plan' },
    ],
  },
  {
    id: 'auto',
    title: '自动化操作中心',
    subtitle: 'Automated Operations Center',
    icon: 'auto',
    iconImage: '/public/image/portal/4.png',
    titleImage: '/public/image/portal/title4.png',
    permKey: '/center/automation',
    children: [
      { title: '任务中心', path: '/taskManage/taskManage', icon: <ProjectOutlined />, permKey: '/taskManage/taskManage' },
      { title: '自愈管理', path: '/job-tpls', icon: <ToolOutlined />, permKey: '/job-tpls' },
      { title: '巡检中心', path: '/inspection/inspectionList', icon: <ScanOutlined />, permKey: '/inspection/inspectionList' },
    ],
  },
  {
    id: 'analysis',
    title: '运营服务中心',
    subtitle: 'Operation Center',
    icon: 'analysis',
    iconImage: '/public/image/portal/5.png',
    titleImage: '/public/image/portal/title5.png',
    permKey: '/center/operation-service',
    children: [
      { title: '资产管理', path: '/xh/assetmgt', icon: <DatabaseOutlined />, permKey: '/xh/assetmgt' },
      { title: 'CMDB', path: '/comingSoon', icon: <AppstoreOutlined />, permKey: '/center/operation-service/cmdb' },
      { title: '拓扑管理', path: '/bigscreen/topology', icon: <NodeIndexOutlined />, permKey: '/bigscreen/topology' },
      { title: '大屏管理', path: '/bigscreen', icon: <FundOutlined />, permKey: '/bigscreen' },
      { title: '组织管理', path: '/users', icon: <TeamOutlined />, permKey: '/users' },
      { title: '系统配置', path: '/comingSoon', icon: <SettingOutlined />, permKey: '/center/operation-service/system-config' },
      { title: '日志分析', path: '/log/operlog', icon: <FileTextOutlined />, permKey: '/center/operation-service/log-analysis' },
      { title: '许可管理', path: '/license/base', icon: <SafetyCertificateOutlined />, permKey: '/license/base' },
      { title: '报表统计', path: '/comingSoon', icon: <BarChartOutlined />, permKey: '/center/operation-service/report-statistics' },
    ],
  },
  {
    id: 'operation',
    title: '智能分析中心',
    subtitle: 'Analysis Center',
    icon: 'operation',
    iconImage: '/public/image/portal/6.png',
    titleImage: '/public/image/portal/title6.png',
    permKey: '/center/intelligent-analysis',
    children: [
      { title: '监控日志', path: '/log/explorer', icon: <FileTextOutlined />, permKey: '/log/explorer' },
      { title: '趋势分析', path: '/comingSoon', icon: <LineChartOutlined />, permKey: '/center/intelligent-analysis/trend' },
      { title: '智能问答', path: '/aiRobot', icon: <RobotOutlined />, permKey: '/center/intelligent-analysis/qa' },
      { title: '故障分析', path: '/comingSoon', icon: <BugOutlined />, permKey: '/center/intelligent-analysis/fault' },
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
    permKey: '/center/security',
    children: [],
  },
];
