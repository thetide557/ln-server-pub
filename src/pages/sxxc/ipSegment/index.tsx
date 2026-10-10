/**
 * IP地址段管理（主页面）
 * 对应原型：陕数工业云 系统配置 → IP地址段管理
 * 布局：左侧分组组织树 + 右侧（统计卡片 / 筛选 / 地址段表格 / 弹窗体系）
 * 数据：mock.ts（后端接口就绪后替换为真实 service）
 */
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Empty, Input, Menu, message, Modal, notification, Progress, Select, Table, Tabs, Tag } from 'antd';
import { ArrowUpOutlined, HomeOutlined, SearchOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { Resizable } from 're-resizable';
import { useHistory, useLocation } from 'react-router-dom';
import { ColumnsType } from 'antd/lib/table';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import GroupTree from './components/GroupTree';
import GroupFormModal from './components/GroupFormModal';
import SegmentFormModal from './components/SegmentFormModal';
import SegmentViewModal from './components/SegmentViewModal';
import RecycleModal from './components/RecycleModal';
import RuleListModal from './components/RuleListModal';
import { IpAssignModal, IpChangeModal, IpRecycleModal, IpReserveModal, IpViewModal } from './ipList/components/IpModals';
import {
  addGroup,
  addSegment,
  assignIp,
  changeIp,
  collectGroupIds,
  deleteGroup,
  deleteIp,
  deleteSegment,
  editGroup,
  editSegment,
  enableSegment,
  getGroups,
  getIpList,
  getIpStats,
  getRecyclableIps,
  getSegments,
  hostCount,
  recycleIps,
  recycleOneIp,
  releaseIp,
  reserveIp,
  scanRecyclable,
} from './mock';
import {
  IpAllocStatus,
  ipAllocStatusMap,
  IpItem,
  IpOnlineStatus,
  ipOnlineStatusMap,
  IpStats,
  IpUseStatus,
  ipUseStatusMap,
} from './types';
import { IpGroup, IpSegment, SegmentStats, SegmentStatus, segmentStatusMap } from './types';
import './index.less';

/** 筛选行过滤条件定义：第一框选维度，第二框联动（input 输入 / select 选状态） */
const QUERY_FILTERS = [
  { name: 'segment', label: '地址段', type: 'input' },
  { name: 'owner', label: '负责人', type: 'input' },
  { name: 'status', label: '地址段状态', type: 'select' },
] as const;

type FilterField = (typeof QUERY_FILTERS)[number]['name'] | undefined;

type IpActionType = 'view' | 'recycle' | 'reserve' | 'assign' | 'change' | 'release';

/** IP 视角筛选维度：枚举类第二框联动为下拉，其余为输入框 */
const IP_QUERY_FILTERS = [
  { name: 'ip', label: 'IP地址', type: 'input' },
  { name: 'useStatus', label: 'IP使用状态', type: 'select' },
  { name: 'allocStatus', label: 'IP分配状态', type: 'select' },
  { name: 'onlineStatus', label: '资产在线状态', type: 'select' },
  { name: 'owner', label: '负责人', type: 'input' },
  { name: 'assetName', label: '资产名称', type: 'input' },
  { name: 'mac', label: 'MAC地址', type: 'input' },
] as const;

type IpFilterField = (typeof IP_QUERY_FILTERS)[number]['name'] | undefined;

/** 枚举筛选维度的可选项 */
const IP_ENUM_OPTIONS: Partial<Record<(typeof IP_QUERY_FILTERS)[number]['name'], { text: string; value: number }[]>> = {
  useStatus: [
    { text: '已使用', value: 1 },
    { text: '未使用', value: 0 },
  ],
  allocStatus: [
    { text: '已分配', value: 1 },
    { text: '预留', value: 2 },
    { text: '未分配', value: 0 },
  ],
  onlineStatus: [
    { text: '在线', value: 1 },
    { text: '离线', value: 0 },
  ],
};

function IpSegmentPage() {
  const history = useHistory();
  const location = useLocation();
  const pagination = usePagination({ PAGESIZE_KEY: 'ip_segments' });
  const [loading, setLoading] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));

  const [groups, setGroups] = useState<IpGroup[]>([]);
  const [segments, setSegments] = useState<IpSegment[]>([]);
  const [tableData, setTableData] = useState<IpSegment[]>([]);
  const [stats, setStats] = useState<SegmentStats>({ total: 0, usageRate: 0, allocated: 0, reserved: 0, remaining: 0, segmentCount: 0 });

  const [selectedGroupId, setSelectedGroupId] = useState<number>();
  const [selectedSegmentId, setSelectedSegmentId] = useState<number>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);

  // 筛选条件：维度（地址段/负责人/地址段状态）+ 值，两框联动，切换维度时清空值
  const [filterField, setFilterField] = useState<FilterField>('segment');
  const [filterValue, setFilterValue] = useState<string | number>();

  // ===== 选中地址段时：IP 视角状态 =====
  /** 选中段的 IP 全量列表 */
  const [ipList, setIpList] = useState<IpItem[]>([]);
  /** IP 视角统计 */
  const [ipStats, setIpStats] = useState<IpStats>({ total: 0, allocated: 0, reserved: 0, online: 0, usageRate: 0 });
  /** IP 视角 tab：ip-list / ip-view */
  const [ipActiveTab, setIpActiveTab] = useState<string>('ip-list');
  /** IP 视角筛选 */
  const [ipFilterField, setIpFilterField] = useState<IpFilterField>('ip');
  const [ipFilterValue, setIpFilterValue] = useState<string | number>();
  /** IP 行操作弹窗 */
  const [ipAction, setIpAction] = useState<IpActionType>();
  const [currentIp, setCurrentIp] = useState<IpItem>();
  /** IP 表格选中行 */
  const [ipSelectedRowKeys, setIpSelectedRowKeys] = useState<number[]>([]);

  // 弹窗状态
  const [groupFormVisible, setGroupFormVisible] = useState(false);
  const [editingGroup, setEditingGroup] = useState<IpGroup>();
  /** 新增子分组时的父分组（一级新增时为空） */
  const [addSubGroupParent, setAddSubGroupParent] = useState<IpGroup>();
  const [segmentFormVisible, setSegmentFormVisible] = useState(false);
  const [editingSegment, setEditingSegment] = useState<IpSegment>();
  const [addGroupForSegment, setAddGroupForSegment] = useState<IpGroup>();
  const [viewSegment, setViewSegment] = useState<IpSegment>();
  const [recycleSegment, setRecycleSegment] = useState<IpSegment>();
  const [ruleGroup, setRuleGroup] = useState<IpGroup>();
  /** 树上 IP 段节点菜单打开的回收规则（地址段视角） */
  const [ruleSegment, setRuleSegment] = useState<IpSegment>();

  const fetchAll = () => {
    setLoading(true);
    Promise.all([getGroups(), getSegments()]).then(([groupRes, segmentRes]) => {
      setGroups(groupRes);
      setSegments(segmentRes.list);
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchAll();
  }, [refreshFlag]);

  // 从 IP 明细页返回时（backState 携带 fromGroupId）：恢复选中该分组并查询其数据
  /** 需展开的分组：选中分组及其全部祖先链（返回时让选中节点可见） */
  const [expandGroupIds, setExpandGroupIds] = useState<number[]>([]);
  useEffect(() => {
    const fromGroupId = (location.state as { fromGroupId?: number } | undefined)?.fromGroupId;
    if (fromGroupId) {
      setSelectedGroupId(fromGroupId);
      setSelectedSegmentId(undefined);
      if (groups.length > 0) {
        // 祖先链：从该分组沿 parentId 向上收集（需等 groups 加载完成）
        const chain: number[] = [];
        let cur = _.find(groups, { id: fromGroupId });
        while (cur) {
          chain.push(cur.id);
          cur = cur.parentId ? _.find(groups, { id: cur.parentId }) : undefined;
        }
        setExpandGroupIds(chain);
        // 消费后清掉 state，避免刷新/后续操作重复触发
        history.replace({ pathname: location.pathname, state: {} });
      }
    }
  }, [location.state, groups]);

  // 选中地址段时拉取该段 IP 列表与统计（IP 视角）
  useEffect(() => {
    if (selectedSegmentId) {
      getIpList({ segmentId: selectedSegmentId }).then((res) => setIpList(res.list));
      getIpStats(selectedSegmentId).then((res) => setIpStats(res));
      setIpActiveTab('ip-list');
      setIpSelectedRowKeys([]);
    } else {
      setIpList([]);
    }
  }, [selectedSegmentId, refreshFlag]);

  /** IP 视角筛选后的列表 */
  const filteredIpList = useMemo<IpItem[]>(() => {
    let result: IpItem[] = ipList;
    if (ipFilterField && ipFilterValue !== undefined && ipFilterValue !== '') {
      if (ipFilterField === 'ip') {
        result = _.filter(result, (item) => item.ip.indexOf(String(ipFilterValue)) > -1);
      } else if (ipFilterField === 'owner') {
        // mock 中 IP 无独立负责人字段，按备注/资产名近似匹配
        result = _.filter(result, (item) => (item.note || '').indexOf(String(ipFilterValue)) > -1 || (item.assetName || '').indexOf(String(ipFilterValue)) > -1);
      } else if (ipFilterField === 'assetName') {
        result = _.filter(result, (item) => item.assetName !== undefined && item.assetName.indexOf(String(ipFilterValue)) > -1);
      } else if (ipFilterField === 'mac') {
        result = _.filter(result, (item) => item.mac !== undefined && item.mac.indexOf(String(ipFilterValue)) > -1);
      } else {
        const match: Partial<IpItem> = { [ipFilterField]: Number(ipFilterValue) } as Partial<IpItem>;
        result = _.filter(result, match);
      }
    }
    return result;
  }, [ipList, ipFilterField, ipFilterValue]);

  /** IP 视角当前维度对应的枚举选项（有则为下拉） */
  const ipEnumOptions = ipFilterField ? IP_ENUM_OPTIONS[ipFilterField] : undefined;

  /** 当前选中地址段对象 */
  const selectedSegmentObj = useMemo(() => _.find(segments, { id: selectedSegmentId }), [segments, selectedSegmentId]);

  /** 当前筛选维度对应的控件类型 */
  const filterType: 'input' | 'select' | undefined = QUERY_FILTERS.find((item) => item.name === filterField)?.type;

  /** 范围过滤（选中分组聚合/选中地址段）+ 筛选条件过滤的统一入口 */
  const applyFilters = () => {
    let list = segments;
    if (selectedSegmentId) {
      list = _.filter(list, { id: selectedSegmentId });
    } else if (selectedGroupId) {
      const groupIds = collectGroupIds(selectedGroupId, groups);
      list = _.filter(list, (item) => groupIds.includes(item.groupId));
    }
    if (filterField === 'segment' && filterValue) {
      list = _.filter(list, (item) => item.fullSegment.indexOf(String(filterValue)) > -1);
    } else if (filterField === 'owner' && filterValue) {
      list = _.filter(list, (item) => item.owner.indexOf(String(filterValue)) > -1);
    } else if (filterField === 'status' && filterValue !== undefined && filterValue !== '') {
      list = _.filter(list, { status: Number(filterValue) });
    }
    return list;
  };

  // 选中分组/地址段、筛选条件变化时刷新表格与统计
  useEffect(() => {
    const list = applyFilters();
    setTableData(list);
    const total = _.sumBy(list, (item) => hostCount(item.mask));
    const allocated = _.sumBy(list, 'allocatedCount');
    const reserved = _.sumBy(list, 'reservedIpCount');
    const remaining = total - allocated - reserved;
    setStats({
      total,
      usageRate: total ? Math.min(100, _.round(((allocated + reserved) / total) * 100)) : 0,
      allocated,
      reserved,
      remaining: remaining > 0 ? remaining : 0,
      segmentCount: list.length,
    });
  }, [segments, groups, selectedGroupId, selectedSegmentId, filterField, filterValue, refreshFlag]);

  const handleSearch = () => {
    setTableData(applyFilters());
  };

  const showScanNotification = (hitCount: number) => {
    notification.open({
      message: '扫描完成',
      description: `扫描完成：命中${hitCount}个地址，已加入可回收列表`,
      placement: 'bottomRight',
      duration: 3,
    });
  };

  const handleScan = (segmentId: number) => {
    const hide = message.loading('正在扫描可回收IP...', 0);
    scanRecyclable(segmentId).then((res) => {
      hide();
      showScanNotification(res.hitCount);
    });
  };

  const columns: ColumnsType<IpSegment> = [
    { title: '地址段', dataIndex: 'fullSegment', width: 130 },
    { title: '归属', dataIndex: 'groupName', width: 110, ellipsis: true },
    {
      title: '地址段状态',
      dataIndex: 'status',
      width: 90,
      render: (val) => {
        const item = segmentStatusMap[val];
        return <Tag color={item?.color}>{item?.text}</Tag>;
      },
    },
    {
      title: 'IP使用情况（已使用/未使用）',
      width: 150,
      render: (_, record) => `${record.usedCount}/${record.unusedCount}`,
    },
    {
      title: 'IP分配情况（已分配/预留/未分配）',
      width: 170,
      render: (_, record) => `${record.allocatedCount}/${record.reservedIpCount}/${record.unallocatedCount}`,
    },
    {
      title: '资产在线情况（在线/离线）',
      width: 140,
      render: (_, record) => `${record.onlineCount}/${record.offlineCount}`,
    },
    { title: 'IP使用率', dataIndex: 'usageRate', width: 90, render: (val) => `${val}%` },
    {
      title: '可回收',
      dataIndex: 'recyclableCount',
      width: 80,
      render: (val, record) =>
        record.status === SegmentStatus.InUse ? <span className='recyclable-num'>{val}</span> : '-',
    },
    { title: '负责人', dataIndex: 'owner', width: 80 },
    { title: '操作人', dataIndex: 'operator', width: 80 },
    { title: '更新时间', dataIndex: 'updateTime', width: 140 },
    {
      title: '操作',
      key: 'action',
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Button type='link' size='small' style={{ padding: 0 }} onClick={() => setViewSegment(record)}>
            查看
          </Button>
          {record.status !== SegmentStatus.Disabled && (
            <Button
              type='link'
              size='small'
              style={{ padding: 0, marginLeft: 8 }}
              onClick={() => {
                setEditingSegment(record);
                setSegmentFormVisible(true);
              }}
            >
              编辑
            </Button>
          )}
          {record.status === SegmentStatus.Disabled && (
            <Button
              type='link'
              size='small'
              style={{ padding: 0, marginLeft: 8 }}
              onClick={() => {
                Modal.confirm({
                  title: '启用提醒',
                  content: '确认启用该地址段吗？',
                  onOk: () => {
                    enableSegment(record.id).then(() => {
                      message.success('启用成功');
                      setRefreshFlag(_.uniqueId('refresh_'));
                    });
                  },
                  onCancel() {},
                });
              }}
            >
              启用
            </Button>
          )}
          <Button
            type='link'
            size='small'
            style={{ padding: 0, marginLeft: 8 }}
            onClick={() => {
              // 携带来源分组：返回时主页面恢复选中该分组并查询其数据
              history.push(`/ipSegment/ip/${record.id}`, { fromGroupId: selectedGroupId });
            }}
          >
            明细
          </Button>
          {record.status === SegmentStatus.InUse && (
            <>
              <Button
                type='link'
                size='small'
                style={{ padding: 0, marginLeft: 8 }}
                onClick={() => handleScan(record.id)}
              >
                扫描可回收IP
              </Button>
              <Button
                type='link'
                size='small'
                style={{ padding: 0, marginLeft: 8 }}
                onClick={() => setRecycleSegment(record)}
              >
                回收
              </Button>
            </>
          )}
          {record.status !== SegmentStatus.InUse && (
            <Button
              type='link'
              size='small'
              danger
              style={{ padding: 0, marginLeft: 8 }}
              onClick={() => {
                Modal.confirm({
                  title: '是否确认删除该地址段？',
                  onOk: () => {
                    deleteSegment(record.id).then(() => {
                      message.success('删除成功');
                      if (selectedSegmentId === record.id) {
                        setSelectedSegmentId(undefined);
                      }
                      setRefreshFlag(_.uniqueId('refresh_'));
                    });
                  },
                  onCancel() {},
                });
              }}
            >
              删除
            </Button>
          )}
        </>
      ),
    },
  ];

  const batchMenu = (
    <Menu
      onClick={async ({ key }) => {
        if (selectedRowKeys.length === 0) {
          message.warning('请先勾选地址段');
          return;
        }
        if (key === 'scan') {
          const hide = message.loading('正在扫描可回收IP...', 0);
          const results = await Promise.all(_.map(selectedRowKeys, (id) => scanRecyclable(id)));
          hide();
          showScanNotification(_.sumBy(results, 'hitCount'));
        } else if (key === 'recycle') {
          const hide = message.loading('正在回收...', 0);
          const lists = await Promise.all(_.map(selectedRowKeys, (id) => getRecyclableIps(id)));
          const ids = _.flatten(_.map(lists, (list) => _.map(list, (item) => item.id)));
          await recycleIps(ids);
          hide();
          message.success(`已回收${ids.length}个IP`);
          setRefreshFlag(_.uniqueId('refresh_'));
        } else if (key === 'delete') {
          Modal.confirm({
            title: `是否确认删除选中的${selectedRowKeys.length}个地址段？`,
            onOk: async () => {
              await Promise.all(_.map(selectedRowKeys, (id) => deleteSegment(id)));
              message.success('删除成功');
              setSelectedRowKeys([]);
              setRefreshFlag(_.uniqueId('refresh_'));
            },
            onCancel() {},
          });
        }
      }}
      items={[
        { key: 'scan', label: '批量扫描' },
        { key: 'recycle', label: '批量回收' },
        { key: 'delete', label: '批量删除' },
      ]}
    />
  );

  /** IP 视角「全新空IP」判断（未分配且无任何使用痕迹） */
  const isBlankIp = (record: IpItem) =>
    record.allocStatus === IpAllocStatus.Unallocated &&
    record.useStatus === IpUseStatus.Unused &&
    record.onlineStatus === IpOnlineStatus.None &&
    !record.assetName &&
    record.idleDays === undefined;

  /** IP 视角表格列（与 IP 明细页一致；行操作按状态组合） */
  const ipColumns: ColumnsType<IpItem> = [
    { title: 'IP地址', dataIndex: 'ip', width: 120, fixed: 'left' },
    {
      title: 'IP分配状态',
      dataIndex: 'allocStatus',
      width: 95,
      render: (val) => <Tag color={ipAllocStatusMap[val]?.color}>{ipAllocStatusMap[val]?.text}</Tag>,
    },
    {
      title: 'IP使用状态',
      dataIndex: 'useStatus',
      width: 95,
      render: (val) => <Tag color={ipUseStatusMap[val]?.color}>{ipUseStatusMap[val]?.text}</Tag>,
    },
    {
      title: '资产在线状态',
      dataIndex: 'onlineStatus',
      width: 100,
      render: (val) => <Tag color={ipOnlineStatusMap[val]?.color}>{ipOnlineStatusMap[val]?.text}</Tag>,
    },
    { title: '资产名称', dataIndex: 'assetName', width: 130, ellipsis: true, render: (val) => val || '-' },
    { title: 'MAC地址', dataIndex: 'mac', width: 140, ellipsis: true, render: (val) => val || '-' },
    { title: '接入端口', dataIndex: 'port', width: 90, render: (val) => val || '-' },
    { title: '临时IP', dataIndex: 'isTempIp', width: 80, render: (val) => (val === -1 ? '-' : val === 1 ? '是' : '否') },
    { title: '网关', dataIndex: 'isGateway', width: 70, render: (val) => (val === -1 ? '-' : val === 1 ? '是' : '否') },
    { title: '最后在线时间', dataIndex: 'lastOnlineTime', width: 150, render: (val) => val || '-' },
    { title: '闲置天数', dataIndex: 'idleDays', width: 85, render: (val) => (val === undefined ? '-' : val) },
    { title: '备注', dataIndex: 'note', width: 130, ellipsis: true, render: (val) => val || '-' },
    {
      title: '操作',
      key: 'action',
      width: 170,
      fixed: 'right',
      render: (_, record) => {
        const openIpAction = (type: IpActionType) => () => {
          setCurrentIp(record);
          setIpAction(type);
        };
        if (record.allocStatus === IpAllocStatus.Allocated) {
          return (
            <>
              <Button type='link' size='small' style={{ padding: 0 }} onClick={openIpAction('view')}>
                查看
              </Button>
              <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={openIpAction('change')}>
                变更
              </Button>
              <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={openIpAction('recycle')}>
                回收
              </Button>
            </>
          );
        }
        if (record.allocStatus === IpAllocStatus.Reserved) {
          return (
            <>
              <Button type='link' size='small' style={{ padding: 0 }} onClick={openIpAction('view')}>
                查看
              </Button>
              <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={openIpAction('assign')}>
                分配
              </Button>
              <Button
                type='link'
                size='small'
                danger
                style={{ padding: 0, marginLeft: 8 }}
                onClick={() => {
                  Modal.confirm({
                    title: '释放提醒',
                    content: `确认释放IP ${record.ip} 吗？释放后该地址状态为未分配。`,
                    onOk: () => {
                      releaseIp(record.id).then(() => {
                        message.success('释放成功');
                        setRefreshFlag(_.uniqueId('refresh_'));
                      });
                    },
                    onCancel() {},
                  });
                }}
              >
                释放
              </Button>
            </>
          );
        }
        if (isBlankIp(record)) {
          return (
            <>
              <Button type='link' size='small' style={{ padding: 0 }} onClick={openIpAction('reserve')}>
                预留
              </Button>
              <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={openIpAction('assign')}>
                分配
              </Button>
              <Button
                type='link'
                size='small'
                danger
                style={{ padding: 0, marginLeft: 8 }}
                onClick={() => {
                  Modal.confirm({
                    title: '是否确认删除该IP？',
                    onOk: () => {
                      deleteIp(record.id).then(() => {
                        message.success('删除成功');
                        setRefreshFlag(_.uniqueId('refresh_'));
                      });
                    },
                    onCancel() {},
                  });
                }}
              >
                删除
              </Button>
            </>
          );
        }
        return (
          <>
            <Button type='link' size='small' style={{ padding: 0 }} onClick={openIpAction('view')}>
              查看
            </Button>
            <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={openIpAction('assign')}>
              分配
            </Button>
            <Button type='link' size='small' style={{ padding: 0, marginLeft: 8 }} onClick={openIpAction('recycle')}>
              回收
            </Button>
          </>
        );
      },
    },
  ];

  /** IP 视角批量操作 */
  const ipBatchMenu = (
    <Menu
      onClick={({ key }) => {
        if (ipSelectedRowKeys.length === 0) {
          message.warning('请先勾选IP');
          return;
        }
        if (key === 'recycle') {
          Modal.confirm({
            title: `确认回收选中的${ipSelectedRowKeys.length}个IP吗？`,
            content: '回收后地址状态为未分配，资产IP绑定将同步解绑并不再使用。',
            onOk: async () => {
              await Promise.all(_.map(ipSelectedRowKeys, (id) => recycleOneIp(id, '批量回收')));
              message.success('回收成功');
              setIpSelectedRowKeys([]);
              setRefreshFlag(_.uniqueId('refresh_'));
            },
            onCancel() {},
          });
        } else if (key === 'delete') {
          Modal.confirm({
            title: `是否确认删除选中的${ipSelectedRowKeys.length}个IP？`,
            onOk: async () => {
              await Promise.all(_.map(ipSelectedRowKeys, (id) => deleteIp(id)));
              message.success('删除成功');
              setIpSelectedRowKeys([]);
              setRefreshFlag(_.uniqueId('refresh_'));
            },
            onCancel() {},
          });
        }
      }}
      items={[
        { key: 'recycle', label: '批量回收' },
        { key: 'delete', label: '批量删除' },
      ]}
    />
  );

  return (
    <PageLayout icon={<SearchOutlined />} title='IP地址段管理'>
      <div className='ip-segment-page'>
        <Resizable
          style={{ background: '#fff' }}
          size={{ width: 240, height: '100%' }}
          enable={{ right: true }}
          maxWidth={420}
          minWidth={180}
        >
          <GroupTree
            key={expandGroupIds.join('-')}
            groups={groups}
            segments={segments}
            defaultExpandGroupIds={expandGroupIds}
            selectedGroupId={selectedGroupId}
            selectedSegmentId={selectedSegmentId}
            onSelectGroup={(group) => {
              setSelectedGroupId(group.id);
              setSelectedSegmentId(undefined);
            }}
            onSelectSegment={(segment) => {
              setSelectedSegmentId(segment.id);
              setSelectedGroupId(undefined);
            }}
            onAddGroup={() => {
              setEditingGroup(undefined);
              setAddSubGroupParent(undefined);
              setGroupFormVisible(true);
            }}
            onAddSubGroup={(group) => {
              setEditingGroup(undefined);
              setAddSubGroupParent(group);
              setGroupFormVisible(true);
            }}
            onEditGroup={(group) => {
              setEditingGroup(group);
              setGroupFormVisible(true);
            }}
            onDeleteGroup={(group) => {
              Modal.confirm({
                title: '是否确认删除该分组？',
                content: '分组下存在子分组或地址段时不可删除',
                onOk: () => {
                  deleteGroup(group.id).then((res) => {
                    if (!res.success) {
                      message.error(res.message);
                      return;
                    }
                    message.success('删除成功');
                    if (selectedGroupId === group.id) setSelectedGroupId(undefined);
                    setRefreshFlag(_.uniqueId('refresh_'));
                  });
                },
                onCancel() {},
              });
            }}
            onAddSegment={(group) => {
              setAddGroupForSegment(group);
              setEditingSegment(undefined);
              setSegmentFormVisible(true);
            }}
            onShowRules={(group) => setRuleGroup(group)}
            onEditSegment={(segment) => {
              setEditingSegment(segment);
              setAddGroupForSegment(undefined);
              setSegmentFormVisible(true);
            }}
            onDeleteSegment={(segment) => {
              Modal.confirm({
                title: '是否确认删除该地址段？',
                content: `删除后 ${segment.fullSegment} 下的 IP 数据将一并删除`,
                onOk: () => {
                  deleteSegment(segment.id).then(() => {
                    message.success('删除成功');
                    if (selectedSegmentId === segment.id) {
                      setSelectedSegmentId(undefined);
                    }
                    setRefreshFlag(_.uniqueId('refresh_'));
                  });
                },
                onCancel() {},
              });
            }}
            onShowSegmentRules={(segment) => {
              setRuleSegment(segment);
              setSelectedSegmentId(segment.id);
              setSelectedGroupId(undefined);
            }}
          />
        </Resizable>
        <div className='ip-right-area'>
          {selectedSegmentId && selectedSegmentObj ? (
            <>
              {/* ===== IP 视角：点击树上的地址段节点 ===== */}
              <div className='group-overview'>
                <div className='overview-name'>
                  <HomeOutlined className='overview-icon' />
                  <span>{selectedSegmentObj.fullSegment}</span>
                </div>
                <div className='overview-meta'>
                  <span className='info-item'>负责人：{selectedSegmentObj.owner}</span>
                  <span className='info-item'>掩码：{selectedSegmentObj.mask}</span>
                  <span className='info-item'>描述：{selectedSegmentObj.note || '-'}</span>
                </div>
              </div>
              <div className='stats-cards'>
                <div className='stat-card'>
                  <div className='stat-label'>IP总数</div>
                  <div className='stat-value'>{ipStats.total}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>已分配</div>
                  <div className='stat-value'>{ipStats.allocated}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>预留</div>
                  <div className='stat-value'>{ipStats.reserved}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>资产在线数</div>
                  <div className='stat-value'>{ipStats.online}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>IP使用率</div>
                  <div className='stat-value'>{ipStats.usageRate}<span className='stat-unit'>%</span></div>
                  <Progress className='stat-progress' percent={ipStats.usageRate} size='small' showInfo={false} />
                </div>
              </div>
              <Tabs className='ip-view-tabs' activeKey={ipActiveTab} onChange={setIpActiveTab}>
                <Tabs.TabPane tab='IP列表' key='ip-list' />
                <Tabs.TabPane tab='IP视图' key='ip-view' />
              </Tabs>
              {ipActiveTab === 'ip-list' ? (
                <>
                  <div className='filter-bar'>
                    <div className='filter-left'>
                      {/* 第一框：IP 筛选维度 */}
                      <Select
                        placeholder='选择过滤条件'
                        style={{ width: 150 }}
                        value={ipFilterField}
                        onChange={(value) => {
                          setIpFilterField(value);
                          setIpFilterValue(undefined);
                        }}
                      >
                        {_.map(IP_QUERY_FILTERS, (item) => (
                          <Select.Option key={item.name} value={item.name}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      {/* 第二框：枚举下拉 / 输入框联动 */}
                      {ipEnumOptions ? (
                        <Select
                          allowClear
                          placeholder='请选择'
                          style={{ width: 140 }}
                          value={ipFilterValue}
                          onChange={(value) => setIpFilterValue(value)}
                        >
                          {_.map(ipEnumOptions, (item) => (
                            <Select.Option key={item.value} value={item.value}>
                              {item.text}
                            </Select.Option>
                          ))}
                        </Select>
                      ) : (
                        <Input
                          allowClear
                          prefix={<SearchOutlined style={{ color: '#999' }} />}
                          placeholder='请输入'
                          style={{ width: 200 }}
                          value={ipFilterValue}
                          onChange={(e) => setIpFilterValue(e.target.value)}
                        />
                      )}
                      <Button type='primary' onClick={() => setRefreshFlag(_.uniqueId('refresh_'))}>
                        查询
                      </Button>
                      <Button onClick={() => setIpFilterValue(undefined)}>重置</Button>
                    </div>
                    <div className='filter-right'>
                      <span
                        className='link-btn'
                        onClick={() => {
                          message.info('暂无变更记录');
                        }}
                      >
                        变更记录
                      </span>
                      <Dropdown overlay={ipBatchMenu}>
                        <Button>
                          批量操作
                          <span style={{ marginLeft: 4 }}>▾</span>
                        </Button>
                      </Dropdown>
                    </div>
                  </div>
                  <Table
                    size='small'
                    rowKey='id'
                    loading={loading}
                    columns={ipColumns}
                    dataSource={filteredIpList}
                    pagination={{ ...pagination, total: filteredIpList.length }}
                    scroll={{ x: 1500 }}
                    rowSelection={{
                      selectedRowKeys: ipSelectedRowKeys,
                      onChange: (keys) => setIpSelectedRowKeys(keys as number[]),
                    }}
                  />
                </>
              ) : (
                <div className='ip-view-placeholder'>
                  <Empty description='IP视图待后端接口就绪后提供' />
                </div>
              )}
            </>
          ) : (
            <>
              {/* ===== 地址段视角：全部 / 选中分组 ===== */}
              {/* 分组概览：房子图标+名称；第二行负责人（左）+ 分组地址段数（右） */}
              <div className='group-overview'>
                <div className='overview-name'>
                  <HomeOutlined className='overview-icon' />
                  <span>{selectedGroupId ? _.find(groups, { id: selectedGroupId })?.name : '全部地址段'}</span>
                </div>
                <div className='overview-meta'>
                  <span className='info-item'>
                    负责人：{selectedGroupId ? _.find(groups, { id: selectedGroupId })?.owner || '-' : '-'}
                  </span>
                  <span className='overview-count'>分组地址段数：{stats.segmentCount}</span>
                </div>
              </div>
              {/* 统计卡片：IP总数 → 已分配 → 预留 → 剩余IP数 → IP使用率(进度条) */}
              <div className='stats-cards'>
                <div className='stat-card'>
                  <div className='stat-label'>IP总数</div>
                  <div className='stat-value'>{stats.total}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>已分配</div>
                  <div className='stat-value'>{stats.allocated}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>预留</div>
                  <div className='stat-value'>{stats.reserved}<span className='stat-unit'>个</span></div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>剩余IP数</div>
                  <div className='stat-value'>
                    {stats.remaining}
                    <span className='stat-unit'>个</span>
                  </div>
                </div>
                <div className='stat-card'>
                  <div className='stat-label'>IP使用率</div>
                  <div className='stat-value'>{stats.usageRate}<span className='stat-unit'>%</span></div>
                  <Progress className='stat-progress' percent={stats.usageRate} size='small' showInfo={false} />
                </div>
              </div>
              <div className='filter-bar'>
                <div className='filter-left'>
                  {/* 第一框：筛选维度 */}
                  <Select
                    placeholder='选择过滤条件'
                    style={{ width: 140 }}
                    value={filterField}
                    onChange={(value) => {
                      setFilterField(value);
                      // 切换维度时清空第二框的值
                      setFilterValue(undefined);
                    }}
                  >
                    {_.map(QUERY_FILTERS, (item) => (
                      <Select.Option key={item.name} value={item.name}>
                        {item.label}
                      </Select.Option>
                    ))}
                  </Select>
                  {/* 第二框：按维度联动（输入框 / 状态下拉） */}
                  {filterType === 'select' ? (
                    <Select
                      allowClear
                      placeholder='请选择'
                      style={{ width: 160 }}
                      value={filterValue}
                      onChange={(value) => setFilterValue(value)}
                    >
                      {_.map(segmentStatusMap, (item, key) => (
                        <Select.Option key={key} value={Number(key)}>
                          {item.text}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      allowClear
                      prefix={<SearchOutlined style={{ color: '#999' }} />}
                      placeholder='请输入'
                      style={{ width: 200 }}
                      value={filterValue}
                      onChange={(e) => setFilterValue(e.target.value)}
                      onPressEnter={handleSearch}
                    />
                  )}
                  <Button type='primary' onClick={handleSearch}>
                    查询
                  </Button>
                  <Button
                    onClick={() => {
                      setFilterValue(undefined);
                    }}
                  >
                    重置
                  </Button>
                </div>
                <div className='filter-right'>
                  <span
                    className='link-btn'
                    onClick={() => {
                      message.info('暂无变更记录');
                    }}
                  >
                    变更记录
                  </span>
                  <Dropdown overlay={batchMenu}>
                    <Button>
                      批量操作
                      <span style={{ marginLeft: 4 }}>▾</span>
                    </Button>
                  </Dropdown>
                </div>
              </div>
              <Table
                size='small'
                rowKey='id'
                loading={loading}
                columns={columns}
                dataSource={tableData}
                pagination={{ ...pagination, total: tableData.length }}
                scroll={{ x: 1500 }}
                rowSelection={{
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys as number[]),
                }}
              />
            </>
          )}
        </div>

        {/* ===== IP 视角行操作弹窗 ===== */}
        <IpViewModal visible={ipAction === 'view'} ip={currentIp} onClose={() => setIpAction(undefined)} />
        <IpRecycleModal
          visible={ipAction === 'recycle'}
          ip={currentIp}
          onClose={() => setIpAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await recycleOneIp(currentIp.id, values.reason);
            message.success('回收成功');
            setIpAction(undefined);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />
        <IpReserveModal
          visible={ipAction === 'reserve'}
          ip={currentIp}
          onClose={() => setIpAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await reserveIp(currentIp.id, values);
            message.success('预留成功');
            setIpAction(undefined);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />
        <IpAssignModal
          visible={ipAction === 'assign'}
          ip={currentIp}
          onClose={() => setIpAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await assignIp(currentIp.id, values);
            message.success('分配成功');
            setIpAction(undefined);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />
        <IpChangeModal
          visible={ipAction === 'change'}
          ip={currentIp}
          onClose={() => setIpAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await changeIp(currentIp.id, values);
            message.success('变更成功');
            setIpAction(undefined);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />

        {/* 新增/编辑分组 */}
        <GroupFormModal
          visible={groupFormVisible}
          group={editingGroup}
          parentGroupName={addSubGroupParent?.name}
          onClose={() => setGroupFormVisible(false)}
          onOk={async (values) => {
            if (editingGroup) {
              await editGroup(editingGroup.id, values);
              message.success('编辑成功');
            } else {
              const res = await addGroup({ ...values, parentId: addSubGroupParent?.id });
              if (!res.success) {
                message.error(res.message);
                return;
              }
              message.success('新增成功');
            }
            setGroupFormVisible(false);
            setAddSubGroupParent(undefined);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />
        {/* 新增/编辑地址段 */}
        <SegmentFormModal
          visible={segmentFormVisible}
          segment={editingSegment}
          groupName={addGroupForSegment?.name}
          onClose={() => {
            setSegmentFormVisible(false);
            setEditingSegment(undefined);
          }}
          onOk={async (values) => {
            if (editingSegment) {
              const res = await editSegment(editingSegment.id, values);
              if (!res.success) {
                message.error(res.message);
                return;
              }
              message.success('编辑成功');
            } else {
              if (!addGroupForSegment) return;
              const res = await addSegment({ ...values, groupId: addGroupForSegment.id });
              if (!res.success) {
                message.error(res.message);
                return;
              }
              message.success('新增成功');
            }
            setSegmentFormVisible(false);
            setEditingSegment(undefined);
            setRefreshFlag(_.uniqueId('refresh_'));
          }}
        />
        {/* 查看地址段 */}
        <SegmentViewModal
          visible={!!viewSegment}
          segment={viewSegment}
          onClose={() => setViewSegment(undefined)}
        />
        {/* 回收IP */}
        <RecycleModal
          visible={!!recycleSegment}
          segmentId={recycleSegment?.id}
          segmentName={recycleSegment?.fullSegment}
          onClose={() => setRecycleSegment(undefined)}
          onOk={() => setRefreshFlag(_.uniqueId('refresh_'))}
        />
        {/* 回收规则列表：分组视角 */}
        {ruleGroup && (
          <RuleListModal
            visible={!!ruleGroup}
            group={ruleGroup}
            segments={_.filter(segments, (seg) => collectGroupIds(ruleGroup.id, groups).includes(seg.groupId))}
            onClose={() => setRuleGroup(undefined)}
          />
        )}
        {/* 回收规则列表：地址段视角（树上 IP 节点菜单） */}
        {ruleSegment && (
          <RuleListModal
            visible={!!ruleSegment}
            segment={ruleSegment}
            segments={[ruleSegment]}
            onClose={() => setRuleSegment(undefined)}
          />
        )}
      </div>
    </PageLayout>
  );
}

export default IpSegmentPage;
