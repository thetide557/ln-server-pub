import React, { useEffect, useMemo, useState } from 'react';
import { Tree, Input, Empty, Spin, Card, Row, Col, Tabs, message } from 'antd';
import { useHistory, useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { HomeOutlined, ClusterOutlined, DatabaseOutlined, SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import {
  getOverviewTree,
  getRoomSummary,
  getCabinetGroupSummary,
  getCabinetSummary,
  getDeviceTypeStats as fetchDeviceTypeStats,
} from '@/services/assets/dc-overview';
import CabinetUView from './components/CabinetUView';
import CabinetUList from './components/CabinetUList';
import './style.less';

// 树节点类型
interface TreeNodeData {
  id: string | number;
  title: string;
  key: string;
  type: 'room' | 'cabinetGroup' | 'cabinet';
  isLeaf?: boolean;
  children?: TreeNodeData[];
  raw?: any;
}

// 设备类型统计
interface DeviceTypeStat {
  typeName: string;
  total: number;
  online: number;
  offline: number;
}

// 详情数据
interface DetailInfo {
  id: number;
  type: 'room' | 'cabinetGroup';
  name: string;
  code?: string;
  // 机房字段
  subgallery?: string;
  floor?: string | number;
  roomId?: number;
  roomName?: string;
  // 机柜组字段
  row?: string | number;
  startColumn?: string | number;
  endColumn?: string | number;
  // 通用字段
  cabinetCount?: number;
  uTotal?: number;
  uUsed?: number;
  dutyPerson?: string;
  /** 机房图片（存储相对路径，如 etc/picture/xxx.png） */
  imageUrl?: string;
}

// 机柜基础信息（用于 Tabs 页头）
interface CabinetInfo {
  id: number;
  code: string;
  name: string;
  roomName?: string;
  cabinetGroupCode?: string;
  row?: string | number;
  column?: number | string;
  service_partition?: string;
  u_number?: number;
  u_used?: number;
  duty_person?: string;
  raw: any;
}

const RoomOverview: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const urlParams = queryString.parse(location.search);
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKey, setSelectedKey] = useState<React.Key | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInfo, setDetailInfo] = useState<DetailInfo | null>(null);
  const [deviceTypeStats, setDeviceTypeStats] = useState<DeviceTypeStat[]>([]);
  // 选中的机柜（用于 Tabs 视图）
  const [selectedCabinet, setSelectedCabinet] = useState<CabinetInfo | null>(null);
  const [activeTab, setActiveTab] = useState<string>('deviceType');

  // 辅助：后端 image_url 是存储相对路径（如 etc/picture/xxx.png），
  // 实际访问需去掉 etc/ 前缀并加代理前缀：/api/takin/picture/xxx.png（与机房管理页一致）
  const getFullImgUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const normalized = url.replace(/^etc\//, '');
    if (normalized.startsWith('/')) return normalized;
    return `/api/takin/${normalized}`;
  };
  // 机房图片展示地址：优先接口返回，无图/加载失败回退本地占位图
  const ROOM_IMG_FALLBACK = '/image/roomoverview/room_bg.png';
  const [roomImgError, setRoomImgError] = useState<Set<string>>(new Set());
  const resolveRoomImg = (imageUrl?: string) => {
    const full = getFullImgUrl(imageUrl);
    return full && !roomImgError.has(full) ? full : ROOM_IMG_FALLBACK;
  };

  // 递归收集所有节点 key —— 用于全展开
  const collectAllKeys = (nodes: TreeNodeData[]): React.Key[] => {
    const keys: React.Key[] = [];
    const walk = (list: TreeNodeData[]) => {
      list.forEach((n) => {
        keys.push(n.key);
        if (n.children && n.children.length) walk(n.children);
      });
    };
    walk(nodes);
    return keys;
  };

  // 加载三层资源树（6.1 接口，一次拉全树）
  const loadRooms = async () => {
    setLoading(true);
    try {
      const res = await getOverviewTree();
      if (res?.err) {
        setTreeData([]);
        message.error(res.err);
        return;
      }
      const rooms = res?.dat?.rooms || [];
      const treeNodes: TreeNodeData[] = rooms.map((room: any) => {
        const groups: TreeNodeData[] = (room.groups || []).map((group: any) => ({
          id: group.id,
          key: `cabinetGroup-${group.id}`,
          title: group.group_code,
          type: 'cabinetGroup',
          raw: group,
          children: (group.cabinets || []).map((cab: any) => ({
            id: cab.id,
            key: `cabinet-${cab.id}`,
            title: cab.cabinet_name || cab.cabinet_code,
            type: 'cabinet',
            isLeaf: true,
            raw: cab,
          })),
        }));
        return {
          id: room.id,
          key: `room-${room.id}`,
          title: room.room_name || `机房 ${room.id}`,
          type: 'room',
          raw: room,
          children: groups,
          isLeaf: groups.length === 0,
        };
      });
      setTreeData(treeNodes);
      setExpandedKeys(collectAllKeys(treeNodes));
      // 默认选中第一个节点（URL 有 roomId/cabinetGroupId/cabinetId 时跳过，由下方 useEffect 恢复）
      const hasUrlSelection = urlParams.roomId || urlParams.cabinetGroupId || urlParams.cabinetId;
      if (treeNodes.length > 0 && !hasUrlSelection) handleTreeSelect([treeNodes[0].key], { node: treeNodes[0] });
    } finally {
      setLoading(false);
    }
  };

  // 加载设备类型统计（6.4 接口，三层共用：room_id/group_id/cabinet_id 三选一）
  const loadDeviceTypeStats = async (params: { room_id?: number; group_id?: number; cabinet_id?: number }) => {
    try {
      const res = await fetchDeviceTypeStats(params);
      if (res?.err) {
        setDeviceTypeStats([]);
        return;
      }
      const list = res?.dat || [];
      setDeviceTypeStats(list.map((item: any) => ({
        typeName: item.device_type,
        total: item.total,
        online: item.online,
        offline: item.offline,
      })));
    } catch {
      setDeviceTypeStats([]);
    }
  };

  // 处理树选中事件（function 声明有提升，loadRooms 里可调用）
  function handleTreeSelect(selectedKeys: React.Key[], info: any) {
    if (selectedKeys.length === 0) return;
    const node = info.node as TreeNodeData;
    setSelectedKey(selectedKeys[0]);

    // 先清空机柜视图
    setSelectedCabinet(null);

    // 并行加载信息卡 + 设备类型统计，统一控制 loading
    const load = async (tasks: Promise<unknown>[]) => {
      setDetailLoading(true);
      try {
        await Promise.all(tasks);
      } finally {
        setDetailLoading(false);
      }
    };

    if (node.type === 'room') {
      // 机房信息卡（6.2）
      const room = node.raw;
      setDetailInfo({
        id: room.id,
        type: 'room',
        name: room.room_name || `机房 ${room.id}`,
      });
      const params = queryString.stringify({ roomId: room.id });
      history.replace({ pathname: '/xh/roomOverview', search: `?${params}` });
      load([loadRoomDetail(room.id), loadDeviceTypeStats({ room_id: room.id })]);
    } else if (node.type === 'cabinetGroup') {
      // 机柜组信息卡（6.3；无图片字段，先用默认占位图，不调接口取机房图片）
      const group = node.raw;
      setDetailInfo({
        id: group.id,
        type: 'cabinetGroup',
        name: group.group_code || node.title,
      });
      const params = queryString.stringify({ cabinetGroupId: group.id });
      history.replace({ pathname: '/xh/roomOverview', search: `?${params}` });
      load([loadCabinetGroupDetail(group.id), loadDeviceTypeStats({ group_id: group.id })]);
    } else if (node.type === 'cabinet') {
      // 机柜节点 —— 显示 Tabs 视图（信息卡 6.5）
      setDetailInfo(null);
      const cab = node.raw || {};
      setSelectedCabinet({
        id: cab.id,
        code: cab.cabinet_code || node.title,
        name: cab.cabinet_name || cab.cabinet_code || node.title,
        raw: cab,
      });
      const targetTab = urlParams.tab === 'ulist' ? 'ulist' : 'uview';
      setActiveTab(targetTab);
      const params = queryString.stringify({ cabinetId: cab.id, tab: targetTab });
      history.replace({ pathname: '/xh/roomOverview', search: `?${params}` });
      load([loadCabinetDetail(cab.id), loadDeviceTypeStats({ cabinet_id: cab.id })]);
    } else {
      // 其他（比如根节点被取消选中时）
      setDetailInfo(null);
      setDeviceTypeStats([]);
    }
  }

  // 加载机房信息卡详情（6.2）
  const loadRoomDetail = async (id: number) => {
    const res = await getRoomSummary(id);
    if (res?.err) {
      message.error(res.err);
      return;
    }
    const d = res?.dat || {};
    setDetailInfo({
      id,
      type: 'room',
      name: d.room_name || `机房 ${id}`,
      code: d.room_code,
      subgallery: d.building_name,
      floor: d.floor_name,
      cabinetCount: d.cabinet_count,
      uTotal: d.total_u,
      uUsed: d.occupied_u,
      dutyPerson: d.owner_name,
      imageUrl: d.image_url,
    });
  };

  // 加载机柜组信息卡详情（6.3）
  const loadCabinetGroupDetail = async (id: number) => {
    const res = await getCabinetGroupSummary(id);
    if (res?.err) {
      message.error(res.err);
      return;
    }
    const d = res?.dat || {};
    setDetailInfo({
      id,
      type: 'cabinetGroup',
      name: d.group_code,
      roomId: d.room_id,
      roomName: d.room_name,
      row: d.orientation === 'ROW' ? d.row_no : d.col_no,
      startColumn: d.orientation === 'ROW' ? d.start_col_no : d.start_row_no,
      endColumn: d.orientation === 'ROW' ? d.end_col_no : d.end_row_no,
      cabinetCount: d.cabinet_count,
      uTotal: d.total_u,
      uUsed: d.occupied_u,
      dutyPerson: d.owner_name,
    });
  };

  // 加载机柜信息卡详情（6.5）
  const loadCabinetDetail = async (id: number) => {
    const res = await getCabinetSummary(id);
    if (res?.err) {
      message.error(res.err);
      return;
    }
    const d = res?.dat || {};
    setSelectedCabinet((prev) => (prev ? {
      ...prev,
      code: d.cabinet_code || prev.code,
      name: d.cabinet_name || prev.name,
      roomName: d.room_name,
      cabinetGroupCode: d.group_code,
      row: d.row_no,
      column: d.col_no,
      service_partition: d.business_zone,
      u_number: d.u_capacity,
      u_used: d.occupied_u,
      duty_person: d.owner_name,
      raw: d,
    } : prev));
  };

  // 跳转到资产清单
  // 按接口约定带机房维度过滤参数（三选一）：机房进入 room_id / 机柜组进入 cabinet_group_id / 机柜进入 cabinet_id，
  // device_type 为设备类型名（如"服务器"），目标页查询 /xh/assets/filter 时透传这些参数
  const goToAssetList = (deviceType: string) => {
    const searchParams = new URLSearchParams();
    if (selectedCabinet) {
      // 机柜层
      searchParams.set('cabinet_id', String(selectedCabinet.id));
    } else if (detailInfo) {
      if (detailInfo.type === 'room') {
        // 机房层
        searchParams.set('room_id', String(detailInfo.id));
      } else if (detailInfo.type === 'cabinetGroup') {
        // 机柜组层
        searchParams.set('cabinet_group_id', String(detailInfo.id));
      }
    }
    searchParams.set('device_type', deviceType);
    history.push(`/xh/assetmgt?${searchParams.toString()}`);
  };

  // 搜索过滤
  const filteredTreeData = useMemo(() => {
    if (!searchValue.trim()) return treeData;

    const filter = (nodes: TreeNodeData[]): TreeNodeData[] => {
      return nodes
        .map((node): TreeNodeData | null => {
          const titleMatch = node.title.toLowerCase().includes(searchValue.toLowerCase());
          let children: TreeNodeData[] = [];
          if (node.children) {
            children = filter(node.children);
          }
          if (titleMatch || children.length > 0) {
            return { ...node, children: children.length > 0 ? children : node.children };
          }
          return null;
        })
        .filter((n): n is TreeNodeData => n !== null);
    };

    return filter(treeData);
  }, [treeData, searchValue]);

  // 初始化加载
  useEffect(() => {
    loadRooms();
  }, []);

  // 从 URL 恢复选中状态（goBack 从资产详情页返回时触发）
  useEffect(() => {
    if (treeData.length === 0) return;
    const { roomId, cabinetGroupId, cabinetId } = urlParams;

    // 在树中找到目标节点并触发选中
    const findAndSelect = (nodes: TreeNodeData[]): boolean => {
      for (const n of nodes) {
        if (roomId && n.type === 'room' && String(n.id) === String(roomId)) {
          handleTreeSelect([n.key], { node: n });
          return true;
        }
        if (cabinetGroupId && n.type === 'cabinetGroup' && String(n.id) === String(cabinetGroupId)) {
          handleTreeSelect([n.key], { node: n });
          return true;
        }
        if (cabinetId && n.type === 'cabinet' && String(n.id) === String(cabinetId)) {
          handleTreeSelect([n.key], { node: n });
          return true;
        }
        if (n.children && findAndSelect(n.children)) return true;
      }
      return false;
    };
    findAndSelect(treeData);
  }, [treeData, urlParams.roomId, urlParams.cabinetGroupId, urlParams.cabinetId]);

  // 树节点图标
  const renderTreeNodeIcon = (node: TreeNodeData) => {
    switch (node.type) {
      case 'room':
        return <HomeOutlined />;
      case 'cabinetGroup':
        return <ClusterOutlined />;
      case 'cabinet':
        return <DatabaseOutlined />;
      default:
        return null;
    }
  };

  return (
    <PageLayout icon={<HomeOutlined />} title="机房总览">
      <div className="room-overview">
        {/* 左侧树 */}
        <div className="room-overview-left">
          <div className="tree-header">
            <Input
              placeholder="机房/机柜组/机柜"
              prefix={<SearchOutlined />}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              allowClear
            />
          </div>
          <div className="tree-content">
            <Spin spinning={loading}>
              {filteredTreeData.length > 0 ? (
                <Tree<TreeNodeData>
                  treeData={filteredTreeData}
                  expandedKeys={expandedKeys}
                  onExpand={setExpandedKeys}
                  selectedKeys={selectedKey ? [selectedKey] : []}
                  onSelect={handleTreeSelect}
                  fieldNames={{ title: 'title', key: 'key', children: 'children' }}
                  titleRender={(node) => (
                    <span className={`tree-node tree-node-${node.type}`}>
                      {renderTreeNodeIcon(node)}
                      <span className="tree-node-title">{node.title}</span>
                    </span>
                  )}
                />
              ) : (
                !loading && <Empty description="暂无数据" />
              )}
            </Spin>
          </div>
        </div>

        {/* 右侧详情 */}
        <div className="room-overview-right">
          {selectedCabinet ? (
            // ========== 机柜视图：详情头 + Tabs ==========
            <Spin spinning={detailLoading}>
              {/* 机柜信息卡片 —— 图2 布局 */}
              <div className="detail-section">
                <div className="detail-header">
                  <HomeOutlined style={{ fontSize: 18, color: '#1C76FD' }} />
                  <span className="detail-title">{selectedCabinet.name}</span>
                </div>
              <div className="detail-body">
                <div className="detail-body-left">
                  {/* 机柜信息卡：先用默认占位图（6.5 响应无图片字段） */}
                  <img src={ROOM_IMG_FALLBACK} alt="" />
                </div>
                <div className="detail-body-right">
                  <div className="info-grid-row">
                    <div className="info-grid-item">
                      <span className="info-label">机柜编号：</span>
                      <span className="info-value">{selectedCabinet.code || '-'}</span>
                    </div>
                      <div className="info-grid-item">
                        <span className="info-label">所属机柜组：</span>
                        <span className="info-value">{selectedCabinet.cabinetGroupCode || '-'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-label">责任人：</span>
                        <span className="info-value">{selectedCabinet.duty_person || '-'}</span>
                      </div>
                    </div>
                    <div className="info-grid-row">
                      <div className="info-grid-item">
                        <span className="info-label">所在行：</span>
                        <span className="info-value">{selectedCabinet.row ?? '-'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-label">所在列：</span>
                        <span className="info-value">{selectedCabinet.column ?? '-'}</span>
                      </div>
                      <div className="info-grid-item empty"></div>
                    </div>
                    <div className="info-grid-row">
                      <div className="info-grid-item">
                        <span className="info-label">业务分区：</span>
                        <span className="info-value">{selectedCabinet.service_partition || '-'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-label">U位数：</span>
                        <span className="info-value">{selectedCabinet.u_number ?? '-'}</span>
                      </div>
                      <div className="info-grid-item">
                        <span className="info-label">已占用：</span>
                        <span className="info-value">{selectedCabinet.u_used ?? '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs —— Ant Design v4 写法：TabPane */}
              <Tabs activeKey={activeTab} onChange={(key) => {
                setActiveTab(key);
                const params = queryString.stringify({ ...urlParams, tab: key });
                history.replace({ pathname: '/xh/roomOverview', search: `?${params}` });
              }}>
                <Tabs.TabPane tab="设备类型" key="deviceType">
                  <div className="device-types-section">
                    {deviceTypeStats.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {deviceTypeStats.map((deviceType, index) => (
                          <Col span={6} key={index}>
                            <Card className="device-type-card" hoverable>
                              <div className="device-type-content">
                                <div className="device-type-name">{deviceType.typeName}</div>
                                <div className="device-type-stats">
                                  <div className="stat-item">
                                    <span className="stat-value">{deviceType.total}</span>
                                    <span className="stat-label">总数</span>
                                  </div>
                                  <div className="stat-item online">
                                    <span className="stat-value">{deviceType.online}</span>
                                    <span className="stat-label">在线数</span>
                                  </div>
                                  <div className="stat-item offline">
                                    <span className="stat-value">{deviceType.offline}</span>
                                    <span className="stat-label">离线数</span>
                                  </div>
                                </div>
                                <div className="device-type-action">
                                  <span
                                    className="action-link"
                                    onClick={() => goToAssetList(deviceType.typeName)}
                                  >
                                    进入 <ArrowRightOutlined />
                                  </span>
                                </div>
                              </div>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Empty description="暂无设备类型数据" />
                    )}
                  </div>
                </Tabs.TabPane>
                <Tabs.TabPane tab="U位视图" key="uview">
                  <CabinetUView cabinetId={selectedCabinet.id} cabinetCode={selectedCabinet.code} onSlotsChange={() => loadCabinetDetail(selectedCabinet.id)} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="U位列表" key="ulist">
                  <CabinetUList cabinetId={selectedCabinet.id} cabinetCode={selectedCabinet.code} onSlotsChange={() => loadCabinetDetail(selectedCabinet.id)} />
                </Tabs.TabPane>
              </Tabs>
            </Spin>
          ) : !detailInfo ? (
            <div className="right-empty">
              <Empty description="请在左侧选择机房或机柜组" />
            </div>
          ) : (
            <Spin spinning={detailLoading}>
              {/* 机房信息卡片 —— 图3 布局 */}
              {detailInfo.type === 'room' ? (
                <div className="detail-section">
                  <div className="detail-header">
                    <HomeOutlined style={{ fontSize: 18, color: '#1C76FD' }} />
                    <span className="detail-title">{detailInfo.name}</span>
                  </div>
                  <div className="detail-body">
                    <div className="detail-body-left">
                      <img
                        src={resolveRoomImg(detailInfo.imageUrl)}
                        alt=""
                        onError={() => setRoomImgError((prev) => new Set(prev).add(getFullImgUrl(detailInfo.imageUrl)))}
                      />
                    </div>
                    <div className="detail-body-right">
                      <div className="info-grid-row">
                        <div className="info-grid-item">
                          <span className="info-label">编码：</span>
                          <span className="info-value">{detailInfo.code || '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">责任人：</span>
                          <span className="info-value">{detailInfo.dutyPerson || '-'}</span>
                        </div>
                        <div className="info-grid-item empty"></div>
                      </div>
                      <div className="info-grid-row">
                        <div className="info-grid-item">
                          <span className="info-label">所属楼座：</span>
                          <span className="info-value">{detailInfo.subgallery || '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">所属楼层：</span>
                          <span className="info-value">{detailInfo.floor || '-'}</span>
                        </div>
                        <div className="info-grid-item empty"></div>
                      </div>
                      <div className="info-grid-row">
                        <div className="info-grid-item">
                          <span className="info-label">机柜数量：</span>
                          <span className="info-value">{detailInfo.cabinetCount ?? '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">U位数：</span>
                          <span className="info-value">{detailInfo.uTotal ?? '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">已占用：</span>
                          <span className="info-value">{detailInfo.uUsed ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 机柜组信息卡片 —— 图4 布局 */
                <div className="detail-section">
                  <div className="detail-header">
                    <HomeOutlined style={{ fontSize: 18, color: '#1C76FD' }} />
                    <span className="detail-title">{detailInfo.name}</span>
                  </div>
                  <div className="detail-body">
                    <div className="detail-body-left">
                      {/* 机柜组信息卡：先用默认占位图（6.3 响应无图片字段） */}
                      <img src={ROOM_IMG_FALLBACK} alt="" />
                    </div>
                    <div className="detail-body-right">
                      <div className="info-grid-row">
                      <div className="info-grid-item">
                        <span className="info-label">所属机房：</span>
                        <span className="info-value">{detailInfo.roomName || (detailInfo.roomId ? detailInfo.roomId : '-')}</span>
                      </div>
                        <div className="info-grid-item">
                          <span className="info-label">责任人：</span>
                          <span className="info-value">{detailInfo.dutyPerson || '-'}</span>
                        </div>
                        <div className="info-grid-item empty"></div>
                      </div>
                      <div className="info-grid-row">
                        <div className="info-grid-item">
                          <span className="info-label">行：</span>
                          <span className="info-value">{detailInfo.row ?? '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">开始列：</span>
                          <span className="info-value">{detailInfo.startColumn ?? '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">结束列：</span>
                          <span className="info-value">{detailInfo.endColumn ?? '-'}</span>
                        </div>
                      </div>
                      <div className="info-grid-row">
                        <div className="info-grid-item">
                          <span className="info-label">机柜数量：</span>
                          <span className="info-value">{detailInfo.cabinetCount ?? '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">U位数：</span>
                          <span className="info-value">{detailInfo.uTotal ?? '-'}</span>
                        </div>
                        <div className="info-grid-item">
                          <span className="info-label">已占用：</span>
                          <span className="info-value">{detailInfo.uUsed ?? '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 设备类型分类卡片 */}
              <div className="device-types-section">
                {deviceTypeStats.length > 0 ? (
                  <Row gutter={[16, 16]}>
                    {deviceTypeStats.map((deviceType, index) => (
                      <Col span={6} key={index}>
                        <Card className="device-type-card" hoverable>
                          <div className="device-type-content">
                            <div className="device-type-name">{deviceType.typeName}</div>
                            <div className="device-type-stats">
                              <div className="stat-item">
                                <span className="stat-value">{deviceType.total}</span>
                                <span className="stat-label">总数</span>
                              </div>
                              <div className="stat-item online">
                                <span className="stat-value">{deviceType.online}</span>
                                <span className="stat-label">在线数</span>
                              </div>
                              <div className="stat-item offline">
                                <span className="stat-value">{deviceType.offline}</span>
                                <span className="stat-label">离线数</span>
                              </div>
                            </div>
                            <div className="device-type-action">
                              <span
                                className="action-link"
                                onClick={() => goToAssetList(deviceType.typeName)}
                              >
                                进入 <ArrowRightOutlined />
                              </span>
                            </div>
                          </div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <Empty description="暂无设备类型数据" />
                )}
              </div>
            </Spin>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default RoomOverview;
