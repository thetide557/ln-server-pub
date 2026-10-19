import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Popover, Checkbox, Row, Col, Select, Tooltip, Spin } from 'antd';
import { PlusSquareOutlined, MinusSquareOutlined, FileOutlined, PlusOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { useAntdResizableHeader } from 'use-antd-resizable-header';
import valueFormatter from '@/pages/dashboard/Renderer/utils/valueFormatter';
import moment from 'moment';
import dot from 'dot';

import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileSearchOutlined,
  FundOutlined,
  GroupOutlined,
  LeftOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  SearchOutlined,
  SyncOutlined,
  UnorderedListOutlined,
  VideoCameraOutlined,
  StopOutlined
} from '@ant-design/icons';
import './locale';
import './style.less';
import _ from 'lodash';
import { Resizable } from 're-resizable';
import Accordion from './Accordion';
import AccordionModal from './Accordion/accordionModal';
import RegionModal from './RegionModal';
import { HW_SW_OPTIONS, normalizeScopeTreeData, collectScopeTreeExpandedIds, findScopeTreeNode, getScopeSearchParams } from './scopeTree';
import { assetsType, metricsUnitEnum } from '@/store/assetsInterfaces';
import { CommonStateContext } from '@/App';
import { batchShelfXhAssets, deleteXhAssets, getAssetScopeTree, getAssetScopeTreeAssets, getAssetsByCondition, getAssetsByN9eCondition, getAssetstypesByParams, getAssetstypesNew, delAssetstypesNew, delXhAssetstypesNew } from '@/services/assets';
import { getDictDataListByType } from '@/services/system/dict';

import RefreshIcon from '@/components/RefreshIcon';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { OperationModal } from './OperationModal';
import { serviceHierarchyOptions, deviceFormOptions } from './catalog';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { useInterval, useLocalStorage } from 'react-use';


interface OperationsAssetType extends assetsType {
  shelf_record?: {
    is_shelf: boolean;
    operator: string;
    operation_time: number;
  };
}

export enum OperateType {
  BindTag = 'bindTag',
  UnbindTag = 'unbindTag',
  AssetBatchImport = 'assetBatchImport',
  /** 网络设备 OID 模板/导入，弹窗同「导入设备」，接口不同 */
  AssetOidBatchImport = 'assetOidBatchImport',
  AssetBatchExport = 'assetBatchExport',
  UpdateBusi = 'updateBusi',
  RemoveBusi = 'removeBusi',
  UpdateNote = 'updateNote',
  Delete = 'delete',
  ChangeOrganize = 'changeOrganize',
  None = 'none',
  AssetBatchList = 'assetBatchList',
  AssetBatchDelist = 'assetBatchDelist'
}
let queryFilter = [
  { name: 'ip', label: 'IP地址', type: 'input' },
  { name: 'asset_ip', label: '资产IP', type: 'input' },
  { name: 'name', label: '资产名称', type: 'input' },
  { name: 'region', label: '区域', type: 'input' },
  { name: 'hw_sw', label: '软硬件', type: 'select' },
  { name: 'tenant', label: '租户', type: 'input' },
  { name: 'asset_category', label: '资产类型', type: 'input' },
  { name: 'cpu_arch', label: 'CPU架构', type: 'input' },
  { name: 'manufacturers', label: '厂商', type: 'select' },
  { name: 'os', label: '操作系统', type: 'input' },
  { name: 'status', label: '资产状态', type: 'select' },
  { name: 'group_id', label: '业务组', type: 'select' },
  { name: 'position', label: '资产位置', type: 'input' },
  { name: 'maintenanceStatus', label: '维保状态', type: 'select' },
  { name: 'is_shelf', label: '管理状态', type: 'select' },
  // { name: 'service_level', label: '服务层级', type: 'select' },
  // { name: 'device_type', label: '设备形态', type: 'select' },
];

/** 在组织树中查找分组节点 id 从根到该节点的路径（展开祖先链后子节点与 type_list 才可见） */
function findGroupPathToId(
  nodes: any[],
  targetId: number | string,
  path: (number | string)[] = [],
): (number | string)[] | null {
  if (!nodes?.length) return null;
  for (const node of nodes) {
    const nextPath = [...path, node.id];
    if (node.id == targetId) return nextPath;
    if (node.sub_groups?.length) {
      const found = findGroupPathToId(node.sub_groups, targetId, nextPath);
      if (found) return found;
    }
  }
  return null;
}

function isValidAssetTissueId(tissueId: unknown): boolean {
  if (tissueId == null || tissueId === '') return false;
  if (tissueId === -1 || tissueId === '-1') return false;
  if (Number(tissueId) === -1) return false;
  return true;
}

/** 根据当前选中（叶子父分组 parId 或仅分组 tissueId）计算应展开的节点 id */
function getAssetTreeExpandIdsForSelection(
  treeList: any[],
  parId: unknown,
  tissueId: unknown,
): Set<number | string> {
  const firstLevel = new Set(treeList.map((n: any) => n.id));
  let targetId: number | string | null = null;
  if (parId != null && String(parId) !== '') {
    targetId = parId as number | string;
  } else if (isValidAssetTissueId(tissueId)) {
    targetId = tissueId as number | string;
  }
  if (targetId == null) {
    return firstLevel;
  }
  const path = findGroupPathToId(treeList, targetId);
  if (!path?.length) {
    return firstLevel;
  }
  return new Set(path);
}


export default function () {
  const { t } = useTranslation('assets');
  const history = useHistory();
  const location = useLocation();

  const [list, setList] = useState<any[]>([]);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [selectedAssetsName, setSelectedAssetsName] = useState<string[]>([]);
  const [treeData, setTreeData] = React.useState<DataNode[]>();
  const [filterType, setFilterType] = useLocalStorage<any>('asset_filter_type', 'input');
  // const [current, setCurrent] = useLocalStorage('asset_current_from', 1);
  const [current, setCurrent] = useState<number>(1);
  const [pageSize, setPageSize] = useLocalStorage('asset_current_page', 10);
  const [searchVal, setSearchVal] = useLocalStorage<any>('asset_filter_value', null);
  const [filterParam, setFilterParam] = useLocalStorage<any>('asset_filter_param', 'ip');
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));

  const [metricUnits, setMetricUnits] = useState<any>({});

  const [total, setTotal] = useState<number>(0);

  const { busiGroups, profile, permList } = useContext(CommonStateContext);

  const [collapse, setCollapse] = useState(localStorage.getItem('left_asset_list') === '1');
  const [width, setWidth] = useState(_.toNumber(localStorage.getItem('leftassetWidth') || 200));
  const [typeId, setTypeId] = useLocalStorage('monitor_current_type_id', '0');
  const [assetTypes, setAssetTypes] = useState<any[]>([]);

  const [expandedKeys, setExpandedKeys] = useState<any[]>();
  const [modifyType, setModifyType] = useState<boolean>(true);
  const [queryCondition, setQueryCondition] = useState<any>({});
  const [title, setTitle] = useState<any>('');

  // 资产分组
  let treeQuery = {}
  const [treeList, setTreeList] = useState<any>([])
  const [open, setOpen] = useState<boolean>(false)
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [curGroup, setCurGroup] = useState<any>({})
  const [isShow, setIsShow] = useLocalStorage('left_tissueId', Number(-1))
  // const [activeColor, setActiveColor] = useLocalStorage('left_asset_type', Number(-1))
  const [parId, setParId, removeParId] = useLocalStorage('left_parId');
  const [tissueId, setTissueId] = useLocalStorage('left_tissueId', Number(-1))

  const [level, setLevel] = useState<number | undefined>(undefined);  // 资产组织树新增分组层级
  const [parentId, setParentId] = useState(null);  // 资产组织树新增分组父级id
  const [isAllAssets, setIsAllAssets] = useLocalStorage('left_asset_isallassets', false); // 资产组织树点击的是否是全部资产下的节点
  // 树展开状态提升到页面级：仅页面刷新或重新进入路由时展开第一层，其余保持最新状态
  const [assetTreeExpandedIds, setAssetTreeExpandedIds] = useState<Set<number | string>>(() => new Set());
  const assetTreeInitialExpandDone = useRef(false);
  // 用useRef保存递增计数器（每个组件实例独立，不共享）
  const requestIdCounter = useRef(0);
  const [manufacturerOptions, setManufacturerOptions] = useState<{ value: string; label: string }[]>([]);
  // 物理资源下的设备类型
  const [oidTreeList, setOidTreeList] = useState<any[]>([]);
  const [scopeTreeFilter, setScopeTreeFilter] = useState<Record<string, any>>({});
  const scopeSelectionRef = useRef<Record<string, any>>({});
  const scopeTreeRequestId = useRef(0);
  const [treeLoading, setTreeLoading] = useState(false);

  // ===== 机房维度过滤（从机房总览“进入”跳转携带）：room_id / cabinet_group_id / cabinet_id 三选一 =====
  // 仅当 URL 带有任一维度参数时生效；用 ref 保存，避免路由未变时重复解析
  const parseRoomFilterFromSearch = (search: string) => {
    const usp = new URLSearchParams(search);
    const room_id = usp.get('room_id');
    const cabinet_group_id = usp.get('cabinet_group_id');
    const cabinet_id = usp.get('cabinet_id');
    // 设备类型名（如“Mongodb”），查询时作 device_type 参数传给后端
    const deviceType = usp.get('device_type');
    // 三选一，与后端接口约定一致
    const filter: {
      room_id?: number;
      cabinet_group_id?: number;
      cabinet_id?: number;
      deviceType?: string;
    } = {};
    if (cabinet_id) filter.cabinet_id = Number(cabinet_id);
    else if (cabinet_group_id) filter.cabinet_group_id = Number(cabinet_group_id);
    else if (room_id) filter.room_id = Number(room_id);
    if (deviceType) filter.deviceType = deviceType;
    return filter;
  };
  const roomFilterRef = useRef<any>(parseRoomFilterFromSearch(location.search));
  const hasRoomFilter = () => !!(
    roomFilterRef.current.room_id
    || roomFilterRef.current.cabinet_group_id
    || roomFilterRef.current.cabinet_id
    || roomFilterRef.current.deviceType
  );
  // 查询时传后端的机房维度参数（device_type 设备类型名）
  const getRoomFilterParams = () => {
    const { deviceType, ...rest } = roomFilterRef.current;
    // 无 device_type 时不传该参数，避免序列化出 device_type=undefined 污染请求
    return deviceType ? { ...rest, device_type: deviceType } : rest;
  };

  const maintenanceStatusOption = [
    {
      label: '维保中',
      value: 0
    },
    {
      label: '已正常',
      value: 1
    },
    {
      label: '待维保',
      value: 2
    }
  ]
  const filterOptions = {
    hw_sw: HW_SW_OPTIONS,
    status: [
      { value: '1', label: '正常' },
      { value: '0', label: '离线' },
    ],
    group_id: busiGroups.map((group) => {
      return {
        value: _.toString(group.id),
        label: group.name,
      };
    }),
    manufacturers: manufacturerOptions,
    maintenanceStatus: maintenanceStatusOption.map((factory) => {
      return {
        value: _.toString(factory.value),
        label: factory.label,
      };
    }),
    service_level: serviceHierarchyOptions.map((item) => {
      return {
        value: _.toString(item.value),
        label: item.label,
      };
    }),
    device_type: deviceFormOptions.map((item) => {
      return {
        value: _.toString(item.value),
        label: item.label,
      };
    }),
    is_shelf: [
      { value: '上架', label: '已上架' },
      { value: '下架', label: '已下架' },
    ],

  };


  const renderHeaderHelpContent = (field: string, description: string) => (
    <div className='asset-header-help-tooltip'>
      <div className='asset-header-help-tooltip-field'>{field}</div>
      <div className='asset-header-help-tooltip-description'>{description}</div>
    </div>
  );

  const renderHeaderHelpTitle = (label: string, field: string, description: string) => (
    <span className='asset-header-help-title'>
      <span>{label}</span>
      <Tooltip title={renderHeaderHelpContent(field, description)} overlayClassName='asset-header-help-overlay' placement='top'>
        <span className='asset-header-help-icon' onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
          <QuestionCircleOutlined />
        </span>
      </Tooltip>
    </span>
  );

  const getColumnLabel = (column: any) => column.columnLabel || (typeof column.title === 'string' ? column.title : '');

  const rawBaseColumns: any[] = [
    {
      title: '资产名称',
      dataIndex: 'name',
      Ced: 'left',
      ellipsis: true,
      width: 120,
      sorter: (a, b) => {
        return a.name.localeCompare(b.name);
      },
      render(value, record, index) {
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${record.id}&asset_id=${record.id}&action=asset&prom=1`);
            }}
          >
            {value}
          </div>
        );
      },
    },
    {
      title: '设备类型',
      dataIndex: 'type',
      Ced: 'left',
      width: 120,
      align: 'center',
      ellipsis: true,
      sorter: (a, b) => {
        return a.type.localeCompare(b.type);
      },
    },
    {
      title: '区域',
      dataIndex: 'region',
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a.region.localeCompare(b.region);
      },
    },
    {
      title: '软硬件',
      dataIndex: 'hw_sw',
      align: 'center',
      width: 120,
      ellipsis: true,
    },
    {
      title: '租户',
      dataIndex: 'tenant',
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a.tenant.localeCompare(b.tenant);
      },
    },
    {
      title: '资产类型',
      dataIndex: 'asset_category',
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a.asset_category.localeCompare(b.asset_category);
      },
    },
    {
      title: 'CPU架构',
      dataIndex: 'cpu_arch',
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a.cpu_arch.localeCompare(b.cpu_arch);
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'ip',
      align: 'center',
      width: 120,
      ellipsis: true,
      render(value, record, index) {
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${record.id}&asset_id=${record.id}&action=asset&prom=1`);
            }}
          >
            {value}
          </div>
        );
      },
      sorter: (a, b) => {
        return a.ip.localeCompare(b.ip);
      },
    },
    {
      title: '资产IP',
      dataIndex: 'asset_ip',
      align: 'center',
      ellipsis: true,
      width: 120,
    },
    {
      title: '厂商',
      dataIndex: 'manufacturers',
      align: 'center',
      width: 120,
      ellipsis: true,
    },
    {
      title: '位置',
      dataIndex: 'position',
      align: 'center',
      ellipsis: true,
      width: 120,
      sorter: (a, b) => {
        return a.position.localeCompare(b.position);
      },
    },
    {
      title: '所属业务组',
      dataIndex: 'group_id',
      align: 'center',
      ellipsis: true,
      width: 120,
      render(value, record, index) {
        if (value > 0) {
          let groupName = '';
          busiGroups.forEach((group) => {
            if (group.id === value) {
              groupName = group.name;
            }
          });
          return groupName;
        }
      },
    },
    {
      title: '资产状态',
      dataIndex: 'status',
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a.status - b.status;
      },
      render(value, record, index) {
        let label;
        if (value == 0) {
          label = (
            <Tag icon={<CloseCircleOutlined />} color='error'>
              离线
            </Tag>
          );
        } else if (value == 1) {
          label = (
            <Tag icon={<CheckCircleOutlined />} color='success'>
              正常
            </Tag>
          );
        }
        return label;
      },
    },
    {
      title: '运行状态',
      dataIndex: 'health',
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        return a.health - b.health;
      },
      render(value, record, index) {
        let label;
        if (value == 0) {
          label = (
            <Tag icon={<CloseCircleOutlined />} color='error'>
              离线
            </Tag>
          );
        } else if (value == 1) {
          label = (
            <Tag icon={<CheckCircleOutlined />} color='success'>
              在线
            </Tag>
          );
        } else if (value == 2) {
          label = (
            <Tag icon={<SyncOutlined spin />} color='processing'>
              待检测
            </Tag>
          );
        }
        return label;
      },
    },
    {
      title: '维保状态',
      dataIndex: 'maintenance_status',
      align: 'center',
      width: 120,
      ellipsis: true,
      render(value, record, index) {
        let label;
        if (value == 0) {
          label = (
            <Tag icon={< SyncOutlined spin />} color='processing'>
              维保中
            </Tag>
          );
        } else if (value == 1) {
          label = (
            <Tag icon={<CheckCircleOutlined />} color='success'>
              已正常
            </Tag>
          );
        } else if (value == 2) {
          label = (
            <Tag icon={<CloseCircleOutlined />} color='warning'>
              待维保
            </Tag>
          );
        } else if (value == -1) {
          label = (
            <Tag icon={<StopOutlined />} color='processing'>
              暂无
            </Tag>
          );
        }
        return label;
      },
    },
    {
      title: '录入时间',
      dataIndex: 'create_at',
      align: 'center',
      ellipsis: true,
      width: 130,
      render(text, record, index) {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => {
        return a.create_at > b.create_at ? 1 : -1;
      },
    },
    // 管理状态：已上架  已下架
    {
      title: '管理状态',
      dataIndex: ['shelf_record', 'is_shelf'],
      align: 'center',
      width: 120,
      ellipsis: true,
      sorter: (a, b) => {
        const statusA = a.shelf_record?.is_shelf === true ? 1 : 0;
        const statusB = b.shelf_record?.is_shelf === true ? 1 : 0;
        return statusA - statusB;
      },
      render(value, record, index) {
        let label;
        if (value === false) {
          label = (
            <Tag color='default'>
              已下架
            </Tag>
          );
        } else if (value === true) {
          label = (
            <Tag color='success'>
              已上架
            </Tag>
          );
        }
        return label;
      },
    },
    // 管理时长
    {
      title: '管理时长',
      align: 'center',
      width: 120,
      ellipsis: true,
      render(value, record, index) {
        if (record.create_at) {
          const days = moment().diff(moment.unix(record.create_at), 'days');
          // 显示天数，对于小于1天的情况显示为1天
          return (days > 0 ? days : 1) + '天';
        }
        return '-';
      },
      sorter: (a, b) => {
        const daysA = moment().diff(moment.unix(a.create_at), 'days');
        const daysB = moment().diff(moment.unix(b.create_at), 'days');
        return (daysA > 0 ? daysA : 1) - (daysB > 0 ? daysB : 1);
      },
    },
    // 最近更新时间、最近更新人
    {
      title: '最近更新时间',
      dataIndex: ['shelf_record', 'operation_time'],
      align: 'center',
      ellipsis: true,
      width: 130,
      render(text, record, index) {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => {
        return a.shelf_record?.operation_time > b.shelf_record?.operation_time ? 1 : -1;
      },
    },
    {
      title: '最近更新人',
      dataIndex: ['shelf_record', 'operator'],
      align: 'center',
      ellipsis: true,
      width: 120,
    },
    {
      title: '备注',
      dataIndex: 'memo',
      align: 'center',
      ellipsis: true,
      width: 120,
    }
  ];

  const headerHelpByColumnLabel: Record<string, { field: string; description: string }> = {
    '资产状态': { field: '资产状态', description: '反映资产是否在线的状态。' },
    '运行状态': { field: '运行状态', description: '反映部署在资产上的探针、Agent或数据采集服务的运行是否正常的状态。' },
    '管理状态': { field: '管理状态', description: '反映资产在平台中是否已上下架的状态（已下架的资产，不纳入监控范围）。' },
    '管理时长': { field: '管理时长', description: '反映资产在平台中的有效管理周期。' },
  };

  const baseColumns: any[] = rawBaseColumns.map((column, index) => {
    const help = headerHelpByColumnLabel[getColumnLabel(column)];
    if (!help) {
      return column;
    }

    const label = getColumnLabel(column);
    return {
      ...column,
      columnLabel: label,
      title: renderHeaderHelpTitle(label, help.field, help.description),
      showSorterTooltip: false,
    };
  });

  const fixColumns: any[] = [
    {
      title: '操作',
      width: 200,
      align: 'center',
      fixed: 'right',
      render: (text: string, record: OperationsAssetType) => (
        <Space>
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/monitor")) && <VideoCameraOutlined
              title='设置监控'
              onClick={(e) => {
                localStorage.setItem('left_monitor_type', '0');
                history.push('/xh/monitor?mode=view&assetId=' + record.id);
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/detail")) && <FileSearchOutlined
              title='资产详情'
              onClick={(e) => {
                showModal('view', record);
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/chart")) && <FundOutlined
              title='监控图表'
              onClick={(e) => {
                history.push(`/xh/monitor/add?type=monitor&id=${record.id}&asset_id=${record.id}&action=asset&prom=1`);
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/put")) && <EditOutlined
              title='编辑'
              onClick={(e) => {
                showModal('update', record);
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/del")) &&
            record.shelf_record?.is_shelf === false &&
            <DeleteOutlined
              title='删除'
              className='table-operator-area-warning'
              onClick={async () => {
                Modal.confirm({
                  // title: t('common:confirm.delete'),
                  title: '下架后，将不保留资产上下架历史，是否确认删除？', // 更新提示信息
                  onOk: async () => {
                    await deleteXhAssets({ ids: [record.id.toString()] });
                    message.success(t('common:success.delete'));
                    setRefreshKey(_.uniqueId('refreshKey_'));
                    getAssetTree()
                    setSelectedAssets([]);
                  },

                  onCancel() { },
                });
              }}
            ></DeleteOutlined>
          }





        </Space>
      ),
    },
  ];

  // 列处理
  const [groupedColumns, setGroupedColumns] = useState<any>({});
  const [defaultValues, setDefaultValues] = useLocalStorage<string[]>('ASSET_SELECTED_COLUMNS', Array.from(new Set(baseColumns.map((obj) => getColumnLabel(obj)))));
  const [optionColumns, setOptionColumns] = useState<any[]>(baseColumns); // 可选列
  const [selectColumns, setSelectColumns] = useState<any[]>(baseColumns.concat(fixColumns));
  const addedAssetColumnLabels = ['区域', '软硬件', '租户', '资产类型', 'CPU架构'];

  useEffect(() => {
    const currentLabels = defaultValues || [];
    const missingLabels = addedAssetColumnLabels.filter((label) => !currentLabels.includes(label));
    if (missingLabels.length) {
      setDefaultValues(currentLabels.concat(missingLabels));
    }
  }, []);
  // 清洗操作列宽度缓存：localStorage 中历史拖拽宽度（如 660）会覆盖代码指定宽度，此处固定为代码宽度
  const ARH_PERSIST_KEY = 'dashboard-table-resizable-xh-asset-management';
  try {
    const cached = JSON.parse(localStorage.getItem(ARH_PERSIST_KEY) || '{}');
    if (Array.isArray(cached?.resizableColumns)) {
      cached.resizableColumns = cached.resizableColumns.filter(
        (c: any) => c.dataIndex !== 'operate' && c.key !== 'operate',
      );
      localStorage.setItem(ARH_PERSIST_KEY, JSON.stringify(cached));
    }
  } catch (e) {
    /* ignore */
  }
  const { resizableColumns, components, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => selectColumns, [selectColumns]),
    columnsState: {
      persistenceType: 'localStorage',
      persistenceKey: `dashboard-table-resizable-xh-asset-management`,
    },
  });

  useEffect(() => {
    const { optionalColumns } = getAssetTypeItems(typeId, assetTypes);
    setOptionColumns(optionalColumns);
    const newSelectedColumns = optionalColumns.filter((v) => defaultValues?.includes(getColumnLabel(v)));
    setSelectColumns(newSelectedColumns.concat(fixColumns));
  }, [groupedColumns, typeId, assetTypes]);

  /**
   * 选择左边，计算列属性
   */
  const getAssetTypeItems = (
    type: any,
    types?: any,
  ): {
    optionalColumns: any[];
  } => {
    let dealTypes = types != null ? types : assetTypes;
    if (type == '0') {
      return loadAssetTypeAllColumns(dealTypes);
    }

    let optionalColumns: any[] = [];
    const extendType: any = dealTypes.find((v) => v.name === type);
    if (extendType) {
      //TODO：处理分组属性
      const extra_items = new Array();
      extendType.metrics?.forEach((element) => {
        if (element.unit != null && metricsUnitEnum[element.unit]) {
          metricUnits[element.metrics] = {
            label: '(' + metricsUnitEnum[element.unit] + ')',
            unit: element.unit,
          };
        }
        let newItem = {
          name: element.metrics,
          label: element.name,
        };
        extra_items.push(newItem);
      });
      setMetricUnits({ ...metricUnits });

      let extra_props = extendType.extra_props;
      for (let property in extra_props) {
        let group = extra_props[property];
        let columns = new Array();
        if (group != null) {
          for (let item of group.props) {
            item.items.forEach((element) => {
              columns.push({
                title: element.label,
                dataIndex: element.name,
                width: '120px',
                ellipsis: true,
                align: 'center',
              });
            });
            let newItem = {
              name: property + '.' + item.name,
              label: item.label,
            };
            extra_items.push(newItem);
          }
        }
      }

      const cloumns = new Array();
      extra_items.map((item) => {
        cloumns.push({
          title: item.label,
          dataIndex: item.name,
          align: 'center',
          ellipsis: true,
          render: (val, record, i) => {
            if (item.name.split('.').length > 1) {
              return renderItem(item.name, record, i);
            } else {
              return renderMetricsItem(item.label, record, i, metricUnits[item.name] ? metricUnits[item.name].unit : '');
            }
          },
        });
      });

      optionalColumns = baseColumns.concat(cloumns);
    }
    return { optionalColumns };
  };

  function handelShowColumn(checkedValues) {
    let showColumns = new Array();
    optionColumns.map((item, index) => {
      if (checkedValues.includes(getColumnLabel(item))) {
        showColumns.push(item);
      }
    });
    setDefaultValues(showColumns.map((v) => getColumnLabel(v)));
    setSelectColumns(showColumns.concat(fixColumns));
  }


  // 递归处理树形结构，排序、处理type_list
  function sortAndProcessTypeList(nodes) {
    if (!nodes || nodes.length === 0) {
      return [];
    }
    // 对当前层节点按 id 升序排序
    const sortedNodes = nodes.sort((a, b) => {
      if (typeof a.id === "string" && typeof b.id === "string") {
        return a.id.localeCompare(b.id);
      }
      return a.id - b.id;
    });
    // 处理当前层节点的 type_list 并递归处理子节点
    sortedNodes.forEach((node) => {
      // 处理当前节点的 type_list
      if (node.type_list?.length) {
        node["type_list"] = node["type_list"].map((v) => {
          return {
            id: v.name,
            name: v.name,
            ...v,
            parentId: node.id,
          };
        });
      }
      // 如果有子节点，递归处理子节点
      if (node.sub_groups?.length) {
        node.sub_groups = sortAndProcessTypeList(node.sub_groups);
      }
    })
    return sortedNodes;
  }
  const getAssetTree = async () => {
    if (hasRoomFilter()) {
      setRefreshKey(_.uniqueId('refreshKey_'));
      return;
    }
    const requestId = ++scopeTreeRequestId.current;
    setTreeLoading(true);
    try {
      const { dat } = await getAssetScopeTree(getScopeSearchParams(filterParam, searchVal));
      if (requestId !== scopeTreeRequestId.current) return;
      const nodes = normalizeScopeTreeData(dat);
      const hasSearch = Object.keys(getScopeSearchParams(filterParam, searchVal)).length > 0;
      const selected = findScopeTreeNode(nodes, scopeSelectionRef.current);
      // Keep the selected path when search hides its branch so list filters still intersect.
      if (selected || !hasSearch) {
        const activeNode = selected || nodes[0];
        scopeSelectionRef.current = activeNode.scopeValues;
        setScopeTreeFilter((prev) => _.isEqual(prev, activeNode.scopeValues) ? prev : activeNode.scopeValues);
        localStorage.setItem('left_asset_type', activeNode.id);
      } else {
        localStorage.removeItem('left_asset_type');
      }
      setTreeList(nodes);
      setOidTreeList([]);
      if (!assetTreeInitialExpandDone.current) {
        assetTreeInitialExpandDone.current = true;
        setAssetTreeExpandedIds(new Set(collectScopeTreeExpandedIds(nodes)));
        removeParId();
        setTissueId(-1);
        setTypeId('0');
        setIsAllAssets(true);
      } else if (hasSearch) {
        setAssetTreeExpandedIds(new Set(collectScopeTreeExpandedIds(nodes)));
      }
    } catch {
      if (requestId === scopeTreeRequestId.current) {
        setTreeList(normalizeScopeTreeData(undefined));
      }
    } finally {
      if (requestId === scopeTreeRequestId.current) setTreeLoading(false);
    }
  };

  useEffect(() => {
    getDictDataListByType('manufacturer')
      .then((res) => {
        const seen = new Set<string>();
        const options = _.reduce(
          res.dat || [],
          (result: { value: string; label: string }[], item: any) => {
            const value = _.trim(_.toString(item?.dict_value));
            if (!value || seen.has(value)) {
              return result;
            }
            seen.add(value);
            result.push({
              value,
              label: value,
            });
            return result;
          },
          [],
        );
        setManufacturerOptions(options);
      })
      .catch(() => {
        message.error('厂商字典加载失败');
      });
  }, []);

  useEffect(() => {
    //来源数据字典
    getAssetstypesByParams(treeQuery).then((res) => {
      let arr = ['0'];
      const items = res.dat.map((v) => {
        return {
          id: v.name,
          name: v.name,
          ...v,
        };
      });
      let treeData: any[] = [
        {
          id: '0',
          name: '全部资产',
          count: 0,
          children: items,
        },
      ];
      items.map((item, index) => {
        arr.push(item.id);
      });
      setExpandedKeys(arr);
      setAssetTypes(items);
      loadingGroupColumns(items);
      setTreeData(_.cloneDeep(treeData));
    });
  }, []);

  useEffect(() => {
    if (hasRoomFilter()) return;
    const timer = window.setTimeout(() => { getAssetTree(); }, 250);
    return () => {
      window.clearTimeout(timer);
      scopeTreeRequestId.current += 1;
      requestIdCounter.current += 1;
    };
  }, [searchVal, filterParam]);

  useEffect(() => {
    if (!hasRoomFilter() && !treeList.length) return;
    getTableData();
  }, [refreshKey, current, pageSize, treeList, scopeTreeFilter, searchVal, filterParam]);

  useInterval(() => {
    setRefreshKey(_.uniqueId('refreshKey_'));
  }, 1000 * 30);

  const getTableData = () => {
    const requestId = ++requestIdCounter.current;
    const roomMode = hasRoomFilter();
    const searchParams = getScopeSearchParams(filterParam, searchVal);
    const param = {
      ...(roomMode ? getRoomFilterParams() : scopeTreeFilter),
      ...searchParams,
      page: current,
      limit: pageSize,
    };
    setQueryCondition(param);
    const requestFunc = roomMode
      ? (searchParams.query ? getAssetsByN9eCondition : getAssetsByCondition)
      : getAssetScopeTreeAssets;
    requestFunc(param).then(({ dat }) => {
      if (requestId === requestIdCounter.current) {
        setList(dat?.list || []);
        setTotal(dat?.total || 0);
      }
    }).catch(() => {
      if (requestId === requestIdCounter.current) {
        setList([]);
        setTotal(0);
      }
    });
  };

  const popupContent = (
    <div style={{ maxHeight: '550px', overflow: 'scroll' }}>
      <Checkbox.Group value={defaultValues} style={{ width: '100%' }} onChange={handelShowColumn}>
        {optionColumns.map((item, index) => (
          <Row key={'option' + index} style={{ marginBottom: '5px' }}>
            <Col span={24}>
              <Checkbox value={getColumnLabel(item)}>{getColumnLabel(item)}</Checkbox>
            </Col>
          </Row>
        ))}
      </Checkbox.Group>
    </div>
  );

  // 分组数据渲染
  const detailInfo = (id, data) => {
    let columns = groupedColumns[id];
    return (
      <div className='other_infos'>
        <Table style={{ width: '700px' }} dataSource={data} className='other_table' columns={columns} pagination={false}></Table>
      </div>
    );
  };

  const renderItem = (field, record, index) => {
    let key = field.split('.')[1];
    let values = record.expands ? record.expands[key] : [];
    const typeInfo = assetTypes.find((v) => v.name === record.type)
    const extra = typeInfo.extra_props && typeInfo.extra_props[key];

    // 根据属性模板，将list转为字符串。 模板参考：https://github.com/olado/doT
    if (extra && extra.template) {
      const tempFn = dot.template(extra.template);
      try {
        const value = tempFn({ temp1: values });
        return value;
      } catch (e) {
        console.log('values', values)
        console.log('e', e)
      }
    }

    return (
      <>
        <Popover content={detailInfo(key, values)} title='详细记录'>
          <Button type='primary'>详情</Button>
        </Popover>
      </>
    );
  };

  const renderMetricsItem = (field, record, index, unit) => {
    let vaue: any = null;
    for (let item of record.metrics_list) {

      if (item.name == field) {
        if (unit != null && unit.length > 0) {
          vaue = item.value;
        } else {
          vaue = parseFloat(item.value).toFixed(1);
        }
        break;
      }
    }

    if (unit != null && unit.length > 0) {
      return valueFormatter(
        {
          unit: unit,
        },
        vaue,
      ).text;
    } else {
      return vaue;
    }
  };

  const loadingGroupColumns = (dealTypes) => {
    const extra_items = new Array();
    const map = new Map();
    let groupedColumns = {};

    dealTypes.map((extendType) => {
      //TODO：处理分组属性
      let extra_props = extendType.extra_props;
      for (let property in extra_props) {
        let group = extra_props[property];
        let columns = new Array();
        if (group != null) {
          for (let item of group.props) {
            item.items.forEach((element) => {
              columns.push({
                title: element.label,
                dataIndex: element.name,
                width: '120px',
                ellipsis: true,
                align: 'center',
              });
            });
            if (!map.has(item.label)) {
              let newItem = {
                name: property + '.' + item.name,
                label: item.label,
              };
              extra_items.push(newItem);
              map.set(item.label, item.label);
            }
          }
        }
        groupedColumns[property] = columns;
        setGroupedColumns({ ...groupedColumns });
      }
    });
  };

  const loadAssetTypeAllColumns = (
    dealTypes,
  ): {
    optionalColumns: any[];
  } => {
    const extra_items = new Array();
    const map = new Map();

    let optionalColumns: any[] = [];

    dealTypes.map((extendType) => {
      //TODO：处理分组属性
      extendType.metrics?.forEach((element) => {
        if (!map.has(element.name)) {
          if (element.unit != null && metricsUnitEnum[element.unit]) {
            metricUnits[element.metrics] = {
              label: '(' + metricsUnitEnum[element.unit] + ')',
              unit: element.unit,
            };
          }
          let newItem = {
            name: element.metrics,
            label: element.name,
          };
          extra_items.push(newItem);
          map.set(element.name, element.name);
        }
      });
      setMetricUnits({ ...metricUnits });
      let extra_props = extendType.extra_props;
      for (let property in extra_props) {
        let group = extra_props[property];
        let columns = new Array();
        if (group != null) {
          for (let item of group.props) {
            item.items.forEach((element) => {
              columns.push({
                title: element.label,
                dataIndex: element.name,
                width: '120px',
                ellipsis: true,
                align: 'center',
              });
            });
            if (!map.has(item.label)) {
              let newItem = {
                name: property + '.' + item.name,
                label: item.label,
              };
              extra_items.push(newItem);
              map.set(item.label, item.label);
            }
          }
        }
      }
    });
    const cloumns = new Array();
    extra_items.map((item) => {
      cloumns.push({
        title: item.label,
        dataIndex: item.name,
        width: '100px',
        align: 'center',
        ellipsis: true,
        render: (val, record, i) => {
          if (item.name.split('.').length > 1) {
            return renderItem(item.name, record, i);
          } else {
            return renderMetricsItem(item.label, record, i, metricUnits[item.name] ? metricUnits[item.name].unit : '');
          }
        },
      });
    });

    optionalColumns = baseColumns.concat(cloumns);
    return { optionalColumns };
  };

  const showModal = (action: string, formData: any) => {
    if (action == 'add') {
      history.push('/xh/assetmgt/add?mode=edit&&type=');
    } else if (action == 'update') {
      history.push('/xh/assetmgt/add?mode=edit&id=' + formData.id);
    } else if (action == 'view') {
      history.push('/xh/assetmgt/add?mode=view&id=' + formData.id);
    }
  };

  const onPageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
    setRefreshKey(_.uniqueId('refreshKey_'));
  };

  const handleClose = (value: any) => {
    if (value == 'sure') {
      getAssetTree()
    }
    setOpen(false)
  }

  // const handleClickTree = (item: any, par: any) => {
  const handleClickTree = (item: any, par: any, isAllAssets: boolean) => {
    if (item?.isScopeTreeNode) {
      scopeSelectionRef.current = item.scopeValues || {};
      setScopeTreeFilter(item.scopeValues || {});
      setCurrent(1);
      setIsAllAssets(item.node_type === 'root');
      setTypeId('0');
      removeParId();
      setTissueId(-1);
      localStorage.setItem('left_asset_type', item.id);
      setRefreshKey(_.uniqueId('refreshKey_'));
      return;
    }

    // console.log('isAllAssets', isAllAssets)
    // 是否是全部资产下的节点点击
    setIsAllAssets(isAllAssets)

    if (par) {
      setParId(par.id)
      setTypeId(item.id);
      setTissueId(undefined)
    } else {
      setTissueId(item.id);
      // 点父级/全部分组：离开具体资产类型；setTypeId(undefined) 在 react-use 中无效，需用 '0'
      setTypeId('0');
      removeParId();
    }
    // console.log(item);
    // setActiveColor(item.id)
    //资产类型操作
    setCurrent(1);
    localStorage.setItem('left_asset_type', item.id);
    setRefreshKey(_.uniqueId('refreshKey_'));
  }



  /** 资产树组件 */
  // isAllAssets：一个布尔值，用于标记当前节点是否是"全部资产"的子节点。
  const TreeNode = ({ item, expandedIds, onToggle, isAllAssets = false }) => {
    const isExpanded = expandedIds.has(item.id);
    const canExpand = item.sub_groups?.length > 0;
    const displayChildren = canExpand ? item.sub_groups : [];
    return (
      <div key={item.id} className="tree-row">
        <div
          className="tree-group"
          style={{ marginLeft: `${(item.group_level - 1) * 20}px` }}
        >
          <span
            onClick={() => {
              if (canExpand) {
                onToggle(item.id);
              }
            }}
          >
            {canExpand ? (
              isExpanded ? <MinusSquareOutlined style={{ fontSize: 13 }} /> : <PlusSquareOutlined style={{ fontSize: 13 }} />
            ) : <span className="tree-toggle-placeholder" />}
          </span>
          <span
            className="g-name"
            // onClick={() => handleClickTree(item, null)}
            onClick={() => handleClickTree(item, null, isAllAssets)}
            style={{
              backgroundColor:
                item.id == localStorage.getItem("left_asset_type") &&
                  !localStorage.getItem("left_parId")
                  ? "#92b7d1"
                  : "",
            }}
          >
            <span>{item.name}</span>
            {item.count !== undefined && <span className="scope-node-count">{item.count}</span>}
          </span>
          {item.id != -1 && !isAllAssets && !item.isScopeTreeNode && (
            <Dropdown
              // trigger={['click']}
              overlay={
                // @ts-ignore
                <Menu
                  style={{ width: "100px" }}
                  onClick={({ key }) => {
                    // console.log(key);
                    if (key === "edit") {
                      setTitle("编辑分组");
                      setCurGroup(item);
                      setOpen(true);
                      setLevel(item.group_level);
                    } else if (key === "del") {
                      Modal.confirm({
                        title: "是否确认删除该分组？",
                        onOk: async () => {
                          // delAssetstypesNew({ ids: item.id }).then((res) => {
                          delXhAssetstypesNew(item.id).then((res) => {
                            message.success("删除成功");
                            // 删除自己则返回默认
                            if (item.id == tissueId) {
                              localStorage.setItem("left_tissueId", "-1");
                              localStorage.setItem("left_asset_type", "-1");
                              removeParId();
                              setTissueId(-1);
                              // setActiveColor(-1)
                            }
                            getAssetTree();
                            setRefreshKey(_.uniqueId("refreshKey_"));
                            // setSelectedAssets([]);
                          });
                        },
                        onCancel() { },
                      });
                    } else if (key === "add-sub") {
                      setTitle("新增分组");
                      setOpen(true);
                      setCurGroup({});
                      setLevel(item.group_level + 1); // 分组层级
                      setParentId(item.id);
                    }
                  }}
                  items={[
                    ...((profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/addGroup")) && item.group_level < 3 && !item.type_list?.length
                      ? [
                        {
                          key: "add-sub",
                          label: "新增分组",
                          icon: <PlusOutlined />,
                        },
                      ]
                      : []),
                    (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/editGroup")) && { key: "edit", label: "编辑", icon: <EditOutlined /> },
                    (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/delGroup")) && { key: "del", label: "删除", icon: <DeleteOutlined /> },
                  ]}
                ></Menu>
              }
            >
              <span className="more">...</span>
            </Dropdown>
          )}
        </div>
        {isExpanded && item.type_list?.length > 0 && (
          <div
            className="tree-content"
            style={{ marginLeft: `${item.group_level * 24}px` }}
          >
            {_.map(item.type_list, (item1) => {
              return (
                <div key={item1.id} className="tree-asset">
                  <FileOutlined style={{ fontSize: 13 }} />
                  <div
                    style={{
                      backgroundColor:
                        item1.id == localStorage.getItem("left_asset_type") &&
                          parId == item.id
                          ? "#92b7d1"
                          : "",
                    }}
                    className="asset-name"
                    // onClick={() => handleClickTree(item1, item)}

                    onClick={() => handleClickTree(item1, item, isAllAssets)}
                  >
                    <span>{item1.name}</span>
                    <span>{item1.number}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {isExpanded &&
          displayChildren?.length > 0 &&
          displayChildren.map((child) => {
            return (
              <TreeNode
                key={child.id}
                item={child}
                expandedIds={expandedIds}
                onToggle={onToggle}
                isAllAssets={item.id === -1 || isAllAssets}
              />
            );
          })}
      </div>
    );
  };
  // 资产组织树：展开状态由页面传入，仅页面刷新或重新进入路由时展开第一层，点击树/新增分组等保持最新状态
  const AssetTree = ({ data, expandedIds, setExpandedIds }) => {
    useEffect(() => {
      // 避免首次渲染时 expandedIds 初始为空 Set，把历史展开状态覆盖掉
      if (!assetTreeInitialExpandDone.current) return;
      localStorage.setItem("expandedIds", JSON.stringify([...expandedIds]));
    }, [expandedIds]);
    const handleToggle = (nodeId) => {
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
        return newSet;
      });
    };

    return (
      <div>
        {data.map((node) => (
          <TreeNode
            key={node.id}
            item={node}
            expandedIds={expandedIds}
            onToggle={handleToggle}
          />
        ))}
      </div>
    );
  };


  return (
    <PageLayout icon={<GroupOutlined />} title={"运维资产清单"}>
      <div style={{ display: 'inline-flex' }} className='asset_list_view'>
        {/* 机房维度过滤模式（机房总览“进入”跳转）：不展示左侧组织树，只展示过滤后的资产表格 */}
        {!hasRoomFilter() && (
          <Resizable
            style={{
              marginRight: collapse ? 0 : 10,
            }}
            size={{ width: collapse ? 0 : width, height: '100%' }}
            enable={{
              right: collapse ? false : true,
            }}
            onResizeStop={(e, direction, ref, d) => {
              let curWidth = width + d.width;
              if (curWidth < 200) {
                curWidth = 200;
              }
              setWidth(curWidth);
              localStorage.setItem('leftassetWidth', curWidth.toString());
            }}
          >
            <div className={collapse ? 'left-area collapse' : 'left-area'}>
              <div
                className='collapse-btn'
                onClick={() => {
                  localStorage.setItem('left_asset_list', !collapse ? '1' : '0');
                  setCollapse(!collapse);
                }}
              >
                {!collapse ? <LeftOutlined /> : <RightOutlined />}
              </div>
              <div className='left_tree' style={{ display: 'inline-block' }}>
                <div className='asset_organize_cls'>
                  <div className='asset-organize-title'>
                    <span className='asset-organize-title-bar' />
                    <span>资产范围树</span>
                  </div>
                  {(profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/addGroup")) && (
                    <Button
                      type='link'
                      size='small'
                      icon={<PlusOutlined />}
                      className='add_group'
                      onClick={() => setRegionModalOpen(true)}
                    >
                      新增分组
                    </Button>
                  )}
                </div>
                <div className='tree-list'>
                  <Spin spinning={treeLoading}>
                    <AssetTree data={treeList} expandedIds={assetTreeExpandedIds} setExpandedIds={setAssetTreeExpandedIds} />
                  </Spin>
                  {/* {
                  _.map(treeList, (item) => {
                    return (
                      <div key={item.name} className='tree-row'>
                        <div className='tree-group'>
                          <span>{isShow == item.id ? <MinusSquareOutlined style={{ fontSize: 13 }} onClick={() => { setIsShow(null as any) }} /> : <PlusSquareOutlined style={{ fontSize: 13 }} onClick={() => {
                            setIsShow(item.id)
                          }} />}</span>
                          <span className='g-name' onClick={() => handleClickTree(item, null)} style={{ backgroundColor: (item.id == localStorage.getItem('left_asset_type') && !localStorage.getItem('left_parId')) ? '#92b7d1' : '' }}>{item.name}</span>
                          {
                            item.id != -1 && <Dropdown
                              // trigger={['click']}
                              overlay={
                                <Menu
                                  style={{ width: '100px' }}
                                  onClick={({ key }) => {
                                    // console.log(key);
                                    if (key === 'edit') {
                                      setTitle('编辑分组');
                                      setCurGroup(item);
                                      setOpen(true);
                                    } else {
                                      Modal.confirm({
                                        title: '是否确认删除该分组？',
                                        onOk: async () => {
                                          delAssetstypesNew({ ids: item.id }).then((res) => {
                                            message.success('删除成功');
                                            // 删除自己则返回默认
                                            if (item.id == tissueId) {
                                              localStorage.setItem('left_tissueId', '-1')
                                              localStorage.setItem('left_asset_type', '-1')
                                              removeParId()
                                              setTissueId(-1)
                                              // setActiveColor(-1)
                                            }
                                            getAssetTree()
                                            setRefreshKey(_.uniqueId('refreshKey_'));
                                            // setSelectedAssets([]);
                                          });
                                        },
                                        onCancel() { },
                                      });
                                    }

                                  }}
                                  items={[
                                    { key: 'edit', label: '编辑', icon: <EditOutlined />, },
                                    { key: 'del', label: '删除', icon: <DeleteOutlined /> },
                                  ]}
                                ></Menu>
                              }
                            >
                              <span className='more'>...</span>
                            </Dropdown>
                          }
                        </div>
                        {
                          (isShow == item.id) && <div className='tree-content'>
                            {_.map(item.type_list, item1 => {
                              return (
                                <div key={item1.id} className='tree-asset'>
                                  <FileOutlined style={{ fontSize: 13 }} />
                                  <div style={{ backgroundColor: (item1.id == localStorage.getItem('left_asset_type') && parId == item.id) ? '#92b7d1' : '' }} className='asset-name' onClick={() => handleClickTree(item1, item)}>
                                    <span>{item1.name}</span>
                                    <span>{item1.number}</span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        }
                      </div>
                    )
                  })
                } */}
                </div>
                {/* 分组树 */}
                {/* <Accordion
                isAutoInitialized={true}
                treeData={treeData}
                addButton={false}
                addMenu={true}
                expandAll={true}
                selectedKey={typeId}
                expandedKeys={expandedKeys}
                handleClick={async (key: any, node: any, type) => {
                  if (type == 'query' && modifyType) {
                    //资产类型操作
                    setTypeId(key);
                    setCurrent(1);
                    localStorage.setItem('left_asset_type', key);
                    setRefreshKey(_.uniqueId('refreshKey_'));
                  }
                }}
              /> */}
              </div>
            </div>
          </Resizable>
        )}
        <div className='asset-operate_xh'>
          <div className='table-content_xh'>
            <Space>
              <RefreshIcon
                onClick={() => {
                  getAssetTree();
                }}
              />
              <div className='table-handle-search'>
                <Space>
                  <Select
                    value={filterParam}
                    placeholder='选择过滤器'
                    style={{ width: 120 }}
                    // allowClear
                    onChange={(value) => {
                      queryFilter.forEach((item) => {
                        if (item.name == value) {
                          setFilterType(item.type);
                        }
                      });
                      setFilterParam(value);
                      setSearchVal(null);
                      setCurrent(1);
                    }}
                  >
                    {queryFilter.map((item, index) => (
                      <Select.Option value={item.name} key={index}>
                        {item.label}
                      </Select.Option>
                    ))}
                  </Select>
                  {filterType == 'input' && (
                    <Input
                      className={'searchInput'}
                      value={searchVal}
                      allowClear
                      onChange={(e) => {
                        if (e != undefined) {
                          setSearchVal(e.target.value);
                        } else {
                          setSearchVal(null);
                        }
                        setCurrent(1);
                      }}
                      suffix={<SearchOutlined />}
                      placeholder={'输入模糊检索关键字'}
                    />
                  )}
                  {filterType == 'select' && (
                    <Select
                      className={'searchInput'}
                      placeholder={'选择要查询的条件'}
                      value={searchVal}
                      allowClear
                      showSearch
                      filterOption
                      optionFilterProp={'label'}
                      options={filterOptions[filterParam] ? filterOptions[filterParam] : []}
                      onChange={(val) => {
                        if (val != undefined) {
                          setSearchVal(val);
                        } else {
                          setSearchVal(null);
                        }
                        setCurrent(1);

                      }}
                    />
                  )}
                </Space>
              </div>
            </Space>
            <div className='tool_right'>
              <Space>
                {
                  (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/add")) && <div>
                    <Button
                      onClick={() => {
                        showModal('add', null);
                      }}
                      type='primary'
                    >
                      {t('新增')}
                    </Button>
                  </div>
                }
                {
                  (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/col")) && <div>
                    <Popover placement='bottom' content={popupContent} trigger='click' className='filter_columns'>
                      <Button icon={<UnorderedListOutlined />}>显示列</Button>
                    </Popover>
                  </div>
                }
                {
                  (profile.roles?.includes("Admin") || permList.includes("/xh/assetmgt/ops")) && <div>
                    <Dropdown
                      trigger={['click']}
                      overlay={
                        <Menu
                          style={{ width: '100px' }}
                          onClick={({ key }) => {
                            if (key == OperateType.AssetBatchExport) {
                              setOperateType(key as OperateType);
                            } else if (key == OperateType.Delete) {
                              if (selectedAssets.length <= 0) {
                                message.warning('请选择要批量操作的设备');
                                return;
                              } else {
                                Modal.confirm({
                                  title: '确认要删除吗',
                                  onOk: async () => {
                                    let rows = selectedAssets?.map((item) => '' + item);
                                    deleteXhAssets({ ids: rows }).then((res) => {
                                      message.success('删除成功！');
                                      setRefreshKey(_.uniqueId('refreshKey_'));
                                      getAssetTree()
                                      setSelectedAssets([]);
                                    });
                                  },
                                  onCancel() { },
                                });
                              }
                            } else if (key == OperateType.UpdateBusi) {
                              if (selectedAssets.length <= 0) {
                                message.warning('请选择要批量转移的资产');
                                return;
                              }
                              setOperateType(key as OperateType);
                            } else if (key == OperateType.AssetBatchList || key == OperateType.AssetBatchDelist) {

                              const data = {
                                "asset_ids": selectedAssets,
                                "is_shelf": key === OperateType.AssetBatchList
                              }
                              batchShelfXhAssets(data).then((res) => {
                                message.success('批量操作成功！');
                                getAssetTree()
                                // setSelectedAssets([]);
                              });
                              console.log('OperateType.AssetBatchList==', data)
                            } else {
                              setOperateType(key as OperateType);
                            }
                          }}
                          items={[
                            { key: OperateType.AssetBatchImport, label: '导入设备' },
                            // 仅当选中组织树下某一叶子类型「网络设备」时出现（点了父级/全部资产会清 parId，避免 localStorage 残留 typeId 误判）
                            ...(oidTreeList.includes(typeId) && parId != null && parId !== ''
                              ? [{ key: OperateType.AssetOidBatchImport, label: 'oid扩展属性导入' }]
                              : []),
                            { key: OperateType.AssetBatchExport, label: '导出设备' },
                            // { key: OperateType.BindTag, label: '绑定标签' },
                            // { key: OperateType.UnbindTag, label: '解绑标签' },
                            { key: OperateType.UpdateBusi, label: '批量转移' },
                            // { key: OperateType.RemoveBusi, label: '移出业务组' },
                            // { key: OperateType.UpdateNote, label: '修改备注' },
                            { key: OperateType.Delete, label: '批量删除' },
                            { key: OperateType.AssetBatchList, label: '批量上架' },
                            { key: OperateType.AssetBatchDelist, label: '批量下架' },
                          ]}
                        ></Menu>
                      }
                    >
                      <Button>
                        {t('common:btn.batch_operations')} <DownOutlined />
                      </Button>
                    </Dropdown>
                  </div>
                }


              </Space>
            </div>
          </div>
          <div className='renderer-table-container'>
            <div className='assets-list-1 renderer-table-container-box'>
              <Table
                dataSource={list}
                className='table-view'
                scroll={{ x: tableWidth }}
                components={components}
                columns={resizableColumns}
                bordered
                rowSelection={{
                  onChange: (_, rows) => {
                    setSelectedAssets(rows ? rows.map(({ id }) => id) : []);
                    setSelectedAssetsName(rows ? rows.map(({ name }) => name) : []);
                  },
                }}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,

                  total: total,
                  onChange: onPageChange,
                  current: current,
                  pageSize: pageSize,
                  showTotal: (total) => `总共 ${total} 条`,
                  pageSizeOptions: [10, 20, 50, 100],
                }}
                rowKey='id'
                size='small'
              ></Table>
              <OperationModal
                operateType={operateType}
                setOperateType={setOperateType}
                assets={selectedAssets}
                names={selectedAssetsName}
                reloadList={() => {
                  setRefreshKey(_.uniqueId('refreshKey_'));
                  getAssetTree();
                }}
              />
            </div>
          </div>
        </div>
        {regionModalOpen && (
          <RegionModal
            onCancel={() => setRegionModalOpen(false)}
            onCreated={() => {
              message.success('新增成功');
              setRegionModalOpen(false);
              getAssetTree();
            }}
          />
        )}
        {/* 分组弹窗 */}
        {open && (
          <AccordionModal
            title={title}
            open={open}
            curGroup={curGroup}
            closeOpen={handleClose}
            treeData={treeData}
            level={level}
            parentId={parentId}
          />
        )}
      </div>
    </PageLayout>
  );
}

