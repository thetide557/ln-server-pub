import React, { useEffect, useMemo, useState } from 'react';
import {
  Table, Tag, Select, Space, Button, Dropdown, Menu, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { getCabinetUSlots } from '@/services/assets/dc-overview';
import type { CabinetUSlot } from '@/services/assets/dc-overview';
import {
  OccupyModal, ReserveModal, ReleaseModal,
  DisableModal, EnableModal, CancelReserveModal, MigrateModal,
} from './USlotModals';

/** TODO: 后端提供 U位变更记录查询接口与批量操作接口后，改为 true 即恢复入口（含表格行勾选） */
const SHOW_PENDING_FEATURES = false;

const STATUS_LABEL: Record<CabinetUSlot['status'], { label: string; color: string }> = {
  used:     { label: '已占用', color: 'blue'   },
  idle:     { label: '空闲',   color: 'success' },
  reserved: { label: '预留',   color: 'orange' },
  fault:    { label: '故障',   color: 'red'    },
  disabled: { label: '禁用',   color: 'default'},
};

interface Props {
  cabinetId: number | string;
  cabinetCode: string;
  /** U 位变更（占用/释放/迁移等）后通知父级刷新设备统计 */
  onSlotsChange?: () => void;
}

type ModalType = null | 'occupy' | 'disable' | 'enable' | 'release' | 'cancelReserve' | 'reserve' | 'migrate';

/** 机柜 U 位列表 —— 表格 + 不同状态不同操作 + 共享 Modal 弹窗 */
const CabinetUList: React.FC<Props> = ({ cabinetId, cabinetCode, onSlotsChange }) => {
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [allSlots, setAllSlots] = useState<CabinetUSlot[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  // 弹窗状态
  const [modalType, setModalType] = useState<ModalType>(null);
  const [currentSlot, setCurrentSlot] = useState<CabinetUSlot | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getCabinetUSlots(cabinetId, { cabinet_code: cabinetCode });
        setAllSlots(res?.dat || []);
      } finally {
        setLoading(false);
      }
    };
    if (cabinetId) load();
  }, [cabinetId, cabinetCode]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCabinetUSlots(cabinetId, { cabinet_code: cabinetCode });
      setAllSlots(res?.dat || []);
      setSelectedRowKeys([]);
    } finally {
      setLoading(false);
    }
  }, [cabinetId, cabinetCode]);

  const filtered = useMemo(() => {
    const list = statusFilter === 'all' ? allSlots : allSlots.filter((s) => s.status === statusFilter);
    return [...list].sort((a, b) => a.u_position - b.u_position);
  }, [allSlots, statusFilter]);

  // ========== 工具函数 ==========

  /** 更新本地 U 位状态（操作成功后本地 patch 优化体验） */
  const patchSlot = (uPositions: number[], patch: Partial<CabinetUSlot>) => {
    setAllSlots((prev) => prev.map((s) =>
      uPositions.includes(s.u_position) ? { ...s, ...patch } : s,
    ));
  };

  // ========== 弹窗打开 ==========

  const openModal = (type: ModalType, slot: CabinetUSlot) => {
    setCurrentSlot(slot);
    setModalType(type);
  };

  // ========== 弹窗关闭 ==========

  const closeModal = () => {
    setModalType(null);
    setCurrentSlot(null);
  };

  // ========== 弹窗提交成功统一处理 ==========

  const handleSuccess = (positions: number[], patch: Partial<CabinetUSlot>) => {
    patchSlot(positions, patch);
    // 通知父级刷新设备类型统计等信息卡
    onSlotsChange?.();
  };

  // ========== 操作列渲染 ==========

  const renderActions = (slot: CabinetUSlot) => {
    const link = (label: string, onClick: () => void, danger = false) => (
      <a onClick={onClick} style={{ marginRight: 8, color: danger ? '#FF4D4F' : '#1C76FD' }}>
        {label}
      </a>
    );
    switch (slot.status) {
      case 'idle':
        return (<>
          {link('占用', () => openModal('occupy', slot))}
          {link('预留', () => openModal('reserve', slot))}
          {link('禁用', () => openModal('disable', slot), true)}
        </>);
      case 'used':
      case 'fault':
        return (<>
          {link('释放', () => openModal('release', slot))}
          {link('迁移', () => openModal('migrate', slot))}
          <a style={{ color: '#1C76FD', cursor: 'pointer' }} onClick={() => slot.asset_id && history.push(`/xh/assetmgt/add?mode=view&id=${slot.asset_id}&from=roomOverview`)}>资产详情</a>
        </>);
      case 'reserved':
        return link('取消预留', () => openModal('cancelReserve', slot), true);
      case 'disabled':
        return link('启用', () => openModal('enable', slot));
      default:
        return null;
    }
  };

  // ========== 批量操作 ==========

  const onBatch = (key: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择 U 位');
      return;
    }
    message.info(`批量${key}（选中 ${selectedRowKeys.length} 条）—— 后端对接后实现`);
  };

  const columns: ColumnsType<CabinetUSlot> = useMemo(() => [
    {
      title: 'U位编号',
      dataIndex: 'u_position',
      key: 'u_position',
      width: 140,
      render: (_, r) => `${r.cabinet_code || cabinetCode}+${r.u_position}U`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (st: CabinetUSlot['status']) => <Tag color={STATUS_LABEL[st].color}>{STATUS_LABEL[st].label}</Tag>,
    },
    {
      title: '占用资产名称',
      dataIndex: 'asset_name',
      key: 'asset_name',
      width: 180,
      render: (_, r) => {
        if (r.status === 'reserved') return r.reserved_reason || '-';
        if (r.status === 'disabled') return r.disabled_reason || '-';
        return r.asset_name || '-';
      },
    },
    { title: '占用U数', dataIndex: 'occupy_u', key: 'occupy_u', width: 80, render: (v) => v ? `${v}U` : '-' },
    { title: 'IP地址', dataIndex: 'asset_ip', key: 'asset_ip', width: 140, render: (v) => v || '-' },
    { title: '资产类型', dataIndex: 'asset_type', key: 'asset_type', width: 120, render: (v) => v || '-' },
    { title: '资产型号', dataIndex: 'asset_model', key: 'asset_model', width: 140, render: (v) => v || '-' },
    { title: '责任人', dataIndex: 'duty_person', key: 'duty_person', width: 90, render: (v) => v || '-' },
    { title: '更新人', dataIndex: 'update_by', key: 'update_by', width: 90, render: (v) => v || '-' },
    { title: '更新时间', dataIndex: 'update_time', key: 'update_time', width: 160, render: (v) => v || '-' },
    { title: '操作', key: 'action', fixed: 'right', width: 220, render: (_, r) => renderActions(r) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [cabinetCode]);

  // ========== JSX ==========

  // 共享弹窗 props
  const modalProps = {
    slot: currentSlot,
    cabinetCode,
    cabinetId,
    allSlots,
    onClose: closeModal,
    onSuccess: handleSuccess,
    reload,
  };

  return (
    <div>
      {/* 顶部操作条 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12, padding: '10px 12px', background: '#fff', borderRadius: 6,
        border: '1px solid #E5E6EB',
      }}>
        <Space size={12}>
          <span style={{ color: '#4E5969' }}>状态</span>
          <Select
            style={{ width: 130 }}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPagination((p) => ({ ...p, current: 1 })); }}
            options={[
              { label: '全部', value: 'all' },
              { label: '已占用', value: 'used' },
              { label: '空闲', value: 'idle' },
              { label: '预留', value: 'reserved' },
              { label: '故障', value: 'fault' },
              { label: '禁用', value: 'disabled' },
            ]}
          />
        </Space>
        {SHOW_PENDING_FEATURES && (
          <Space size={8}>
            <Button>U位变更记录</Button>
            <Dropdown
              overlay={
                <Menu onClick={({ key }) => onBatch(String(key))}>
                  <Menu.Item key="禁用">批量禁用</Menu.Item>
                  <Menu.Item key="启用">批量启用</Menu.Item>
                  <Menu.Item key="释放">批量释放（已占用）</Menu.Item>
                  <Menu.Item key="取消预留">批量取消预留</Menu.Item>
                </Menu>
              }
            >
              <Button>批量操作 <DownOutlined /></Button>
            </Dropdown>
          </Space>
        )}
      </div>

      {/* 表格 */}
      <Table<CabinetUSlot>
        size="small"
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={filtered}
        rowSelection={SHOW_PENDING_FEATURES ? { selectedRowKeys, onChange: setSelectedRowKeys } : undefined}
        scroll={{ x: 1320 }}
        pagination={{
          ...pagination,
          total: filtered.length,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (page, pageSize) => setPagination((p) => ({ ...p, current: page, pageSize })),
        }}
      />

      {/* ============ 共享弹窗 ============ */}
      <OccupyModal visible={modalType === 'occupy'} {...modalProps} />
      <ReserveModal visible={modalType === 'reserve'} {...modalProps} />
      <ReleaseModal visible={modalType === 'release'} {...modalProps} />
      <DisableModal visible={modalType === 'disable'} {...modalProps} />
      <EnableModal visible={modalType === 'enable'} {...modalProps} />
      <CancelReserveModal visible={modalType === 'cancelReserve'} {...modalProps} />
      <MigrateModal visible={modalType === 'migrate'} {...modalProps} />
    </div>
  );
};

export default CabinetUList;
