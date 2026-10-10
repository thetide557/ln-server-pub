/**
 * IP地址段管理 - IP 明细页
 * 对应原型：IP地址段管理-IP 页面
 * 头部地址段信息（负责人/掩码/描述） + 统计卡片 + IP列表/IP视图 tab + 筛选 + IP表格 + 操作弹窗
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Empty, Input, Menu, message, Modal, Progress, Select, Table, Tabs, Tag } from 'antd';
import { GroupOutlined, HomeOutlined, SearchOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { ColumnsType } from 'antd/lib/table';
import PageLayout from '@/components/pageLayout';
import usePagination from '@/components/usePagination';
import {
  assignIp,
  changeIp,
  deleteIp,
  getIpList,
  getIpStats,
  getSegments,
  recycleOneIp,
  releaseIp,
  reserveIp,
} from '../mock';
import {
  IpAllocStatus,
  ipAllocStatusMap,
  IpItem,
  IpOnlineStatus,
  ipOnlineStatusMap,
  IpSegment,
  IpStats,
  IpUseStatus,
  ipUseStatusMap,
} from '../types';
import { IpAssignModal, IpChangeModal, IpRecycleModal, IpReserveModal, IpViewModal } from './components/IpModals';
import '../index.less';

type IpActionType = 'view' | 'recycle' | 'reserve' | 'assign' | 'change' | 'release';

/** 筛选行维度定义：枚举类第二框联动为下拉，其余为输入框 */
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

function IpListPage() {
  const history = useHistory();
  const location = useLocation();
  const routeParams = useParams<{ segmentId: string }>();
  const segmentId = Number(routeParams.segmentId) || undefined;
  const pagination = usePagination({ PAGESIZE_KEY: 'ip_segment_ips' });

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<IpItem[]>([]);
  const [stats, setStats] = useState<IpStats>({ total: 0, allocated: 0, reserved: 0, online: 0, usageRate: 0 });
  const [segmentInfo, setSegmentInfo] = useState<IpSegment>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));

  // 筛选：维度 + 值，两框联动，切换维度清空值
  const [filterField, setFilterField] = useState<IpFilterField>('ip');
  const [filterValue, setFilterValue] = useState<string | number>();
  // 当前 tab：ip-list / ip-view
  const [activeTab, setActiveTab] = useState<string>('ip-list');

  // 弹窗状态
  const [action, setAction] = useState<IpActionType>();
  const [currentIp, setCurrentIp] = useState<IpItem>();

  /** 当前筛选维度对应的枚举选项（有则为第二框下拉） */
  const enumOptions = filterField ? IP_ENUM_OPTIONS[filterField] : undefined;

  const fetchData = () => {
    setLoading(true);
    Promise.all([getIpList({ segmentId }), getIpStats(segmentId), getSegments({ segmentId })]).then(
      ([listRes, statsRes, segmentRes]) => {
        setList(listRes.list);
        setStats(statsRes);
        const seg = segmentRes.list?.[0];
        setSegmentInfo(seg);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    if (segmentId) {
      fetchData();
    }
  }, [segmentId, refreshFlag]);

  /** 按筛选维度 + 值过滤 IP 列表（前端过滤，mock 阶段数据全量拉取） */
  const filteredList = useMemo<IpItem[]>(() => {
    let result: IpItem[] = list;
    if (filterField && filterValue !== undefined && filterValue !== '') {
      if (filterField === 'ip') {
        result = _.filter(result, (item) => item.ip.indexOf(String(filterValue)) > -1);
      } else if (filterField === 'owner') {
        // 负责人维度：mock 中 IP 无独立负责人字段，按备注/资产名近似匹配
        result = _.filter(result, (item) => (item.note || '').indexOf(String(filterValue)) > -1 || (item.assetName || '').indexOf(String(filterValue)) > -1);
      } else if (filterField === 'assetName') {
        result = _.filter(result, (item) => item.assetName !== undefined && item.assetName.indexOf(String(filterValue)) > -1);
      } else if (filterField === 'mac') {
        result = _.filter(result, (item) => item.mac !== undefined && item.mac.indexOf(String(filterValue)) > -1);
      } else {
        const match: Partial<IpItem> = { [filterField]: Number(filterValue) } as Partial<IpItem>;
        result = _.filter(result, match);
      }
    }
    return result;
  }, [list, filterField, filterValue]);

  const handleRefresh = () => {
    setRefreshFlag(_.uniqueId('refresh_'));
  };

  /** 判断是否为"全新空IP"（未分配且无任何使用痕迹） */
  const isBlankIp = (record: IpItem) =>
    record.allocStatus === IpAllocStatus.Unallocated &&
    record.useStatus === IpUseStatus.Unused &&
    record.onlineStatus === IpOnlineStatus.None &&
    !record.assetName &&
    record.idleDays === undefined;

  const columns: ColumnsType<IpItem> = [
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
        const buttons: React.ReactNode[] = [];
        const push = (label: string, onClick: () => void, danger = false) => {
          buttons.push(
            <Button
              key={label}
              type='link'
              size='small'
              danger={danger}
              style={{ padding: 0, marginLeft: buttons.length ? 8 : 0 }}
              onClick={onClick}
            >
              {label}
            </Button>,
          );
        };
        const openAction = (type: IpActionType) => () => {
          setCurrentIp(record);
          setAction(type);
        };
        if (record.allocStatus === IpAllocStatus.Allocated) {
          // 已分配：查看、变更、回收
          push('查看', openAction('view'));
          push('变更', openAction('change'));
          push('回收', openAction('recycle'));
        } else if (record.allocStatus === IpAllocStatus.Reserved) {
          // 预留：查看、分配、释放
          push('查看', openAction('view'));
          push('分配', openAction('assign'));
          push('释放', () => {
            Modal.confirm({
              title: '释放提醒',
              content: `确认释放IP ${record.ip} 吗？释放后该地址状态为未分配。`,
              onOk: () => {
                releaseIp(record.id).then(() => {
                  message.success('释放成功');
                  handleRefresh();
                });
              },
              onCancel() {},
            });
          }, true);
        } else if (isBlankIp(record)) {
          // 全新空IP：预留、分配、删除
          push('预留', openAction('reserve'));
          push('分配', openAction('assign'));
          push('删除', () => {
            Modal.confirm({
              title: '是否确认删除该IP？',
              onOk: () => {
                deleteIp(record.id).then(() => {
                  message.success('删除成功');
                  handleRefresh();
                });
              },
              onCancel() {},
            });
          }, true);
        } else {
          // 未分配但有使用痕迹：查看、分配、回收
          push('查看', openAction('view'));
          push('分配', openAction('assign'));
          push('回收', openAction('recycle'));
        }
        return <>{buttons}</>;
      },
    },
  ];

  const batchMenu = (
    <Menu
      onClick={({ key }) => {
        if (selectedRowKeys.length === 0) {
          message.warning('请先勾选IP');
          return;
        }
        if (key === 'recycle') {
          Modal.confirm({
            title: `确认回收选中的${selectedRowKeys.length}个IP吗？`,
            content: '回收后地址状态为未分配，资产IP绑定将同步解绑并不再使用。',
            onOk: async () => {
              await Promise.all(_.map(selectedRowKeys, (id) => recycleOneIp(id, '批量回收')));
              message.success('回收成功');
              setSelectedRowKeys([]);
              handleRefresh();
            },
            onCancel() {},
          });
        } else if (key === 'delete') {
          Modal.confirm({
            title: `是否确认删除选中的${selectedRowKeys.length}个IP？`,
            onOk: async () => {
              await Promise.all(_.map(selectedRowKeys, (id) => deleteIp(id)));
              message.success('删除成功');
              setSelectedRowKeys([]);
              handleRefresh();
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
    <PageLayout
      title='IP地址段管理'
      showBack
      backPath='/ipSegment'
      backState={{ fromGroupId: (location.state as { fromGroupId?: number } | undefined)?.fromGroupId }}
    >
      <div className='ip-list-page'>
        {/* 内容统一包在唯一子元素 .ip-right-area 内：PageLayout 的 "& + div > *" 规则
            会给内容容器的每个直接子元素加白卡背景+阴影，若逐块直接放置会被渲染成多张独立卡片造成“分层” */}
        <div className='ip-right-area'>
        {/* 头部地址段概览：与主页面 IP 视角一致（房子图标+名称加粗，第二行负责人/掩码/描述） */}
        {segmentInfo && (
          <div className='group-overview'>
            <div className='overview-name'>
              <HomeOutlined className='overview-icon' />
              <span>{segmentInfo.fullSegment}</span>
            </div>
            <div className='overview-meta'>
              <span className='info-item'>负责人：{segmentInfo.owner}</span>
              <span className='info-item'>掩码：{segmentInfo.mask}</span>
              <span className='info-item'>描述：{segmentInfo.note || '-'}</span>
            </div>
          </div>
        )}
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
            <div className='stat-label'>资产在线数</div>
            <div className='stat-value'>{stats.online}<span className='stat-unit'>个</span></div>
          </div>
          <div className='stat-card'>
            <div className='stat-label'>IP使用率</div>
            <div className='stat-value'>{stats.usageRate}<span className='stat-unit'>%</span></div>
            <Progress className='stat-progress' percent={stats.usageRate} size='small' showInfo={false} />
          </div>
        </div>
        {/* IP列表 / IP视图 tab */}
        <Tabs
          className='ip-view-tabs'
          activeKey={activeTab}
          onChange={setActiveTab}
        >
          <Tabs.TabPane tab='IP列表' key='ip-list' />
          <Tabs.TabPane tab='IP视图' key='ip-view' />
        </Tabs>
        {activeTab === 'ip-list' ? (
          <>
            <div className='filter-bar'>
              <div className='filter-left'>
                {/* 第一框：筛选维度 */}
                <Select
                  placeholder='选择过滤条件'
                  style={{ width: 150 }}
                  value={filterField}
                  onChange={(value) => {
                    setFilterField(value);
                    setFilterValue(undefined);
                  }}
                >
                  {_.map(IP_QUERY_FILTERS, (item) => (
                    <Select.Option key={item.name} value={item.name}>
                      {item.label}
                    </Select.Option>
                  ))}
                </Select>
                {/* 第二框：按维度联动（枚举下拉 / 输入框） */}
                {enumOptions ? (
                  <Select
                    allowClear
                    placeholder='请选择'
                    style={{ width: 140 }}
                    value={filterValue}
                    onChange={(value) => setFilterValue(value)}
                  >
                    {_.map(enumOptions, (item) => (
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
                    value={filterValue}
                    onChange={(e) => setFilterValue(e.target.value)}
                  />
                )}
                <Button type='primary' onClick={() => setRefreshFlag(_.uniqueId('refresh_'))}>
                  查询
                </Button>
                <Button
                  onClick={() => {
                    // 重置所有查询条件：维度回默认、值清空
                    setFilterField('ip');
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
              dataSource={filteredList}
              pagination={{ ...pagination, total: filteredList.length }}
              scroll={{ x: 1500 }}
              rowSelection={{
                selectedRowKeys,
                onChange: (keys) => setSelectedRowKeys(keys as number[]),
              }}
            />
          </>
        ) : (
          <div className='ip-view-placeholder'>
            <Empty description='IP视图' />
          </div>
        )}

        {/* 查看 */}
        <IpViewModal visible={action === 'view'} ip={currentIp} onClose={() => setAction(undefined)} />
        {/* 回收 */}
        <IpRecycleModal
          visible={action === 'recycle'}
          ip={currentIp}
          onClose={() => setAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await recycleOneIp(currentIp.id, values.reason);
            message.success('回收成功');
            setAction(undefined);
            handleRefresh();
          }}
        />
        {/* 预留 */}
        <IpReserveModal
          visible={action === 'reserve'}
          ip={currentIp}
          onClose={() => setAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await reserveIp(currentIp.id, values);
            message.success('预留成功');
            setAction(undefined);
            handleRefresh();
          }}
        />
        {/* 分配 */}
        <IpAssignModal
          visible={action === 'assign'}
          ip={currentIp}
          onClose={() => setAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await assignIp(currentIp.id, values);
            message.success('分配成功');
            setAction(undefined);
            handleRefresh();
          }}
        />
        {/* 变更 */}
        <IpChangeModal
          visible={action === 'change'}
          ip={currentIp}
          onClose={() => setAction(undefined)}
          onOk={async (values) => {
            if (!currentIp) return;
            await changeIp(currentIp.id, values);
            message.success('变更成功');
            setAction(undefined);
            handleRefresh();
          }}
        />
        </div>
      </div>
    </PageLayout>
  );
}

export default IpListPage;
