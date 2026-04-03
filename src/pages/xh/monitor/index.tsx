import React, { Fragment, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Popover, Checkbox, Row, Col, Select, Tooltip } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import {
  DeleteOutlined,
  DownOutlined,
  EditOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  FundOutlined,
  GroupOutlined,
  LeftOutlined,
  PoweroffOutlined,
  ProfileTwoTone,
  QuestionCircleOutlined,
  RightOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import CommonModal from '@/components/CustomForm/CommonModal';
import { useAntdResizableHeader } from 'use-antd-resizable-header';
import { PlusSquareOutlined, MinusSquareOutlined, FileOutlined, PlusOutlined } from '@ant-design/icons';
import './locale';
import './style.less';
import _ from 'lodash';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import moment from 'moment';
import { Resizable } from 're-resizable';
import { getAssetstypes, getAssetstypesByParams, getAssetsByCondition, getAssetsByMonitor, getAssetDirectoryTree, getXhAsset, getMonitorAssetstypes, getAssetsMonitor, getAssetstypesNew, delXhAssetstypesNew, getMonitortree } from '@/services/assets';
import { getMonitorInfoList, deleteXhMonitor, deleteXhBatchMonitor, updateMonitorStatus } from '@/services/manage';
import { useHistory } from 'react-router-dom';
import { OperationModal } from './OperationModal';
import type { DataNode, TreeProps } from 'antd/es/tree';
import RefreshIcon from '@/components/RefreshIcon';
import { unitTypes } from '../assetmgt/catalog';
import { useLocalStorage } from 'react-use';
import { renderQuery } from '@/components/PromQueryBuilder/RawQuery';
import { PromVisualQuery } from '@/components/PromQueryBuilder/types';
import { CommonStateContext } from '@/App';
import AccordionModal from './Accordion/accordionModal';
export enum OperateType {
  BindTag = 'bindTag',
  UnbindTag = 'unbindTag',
  AssetBatchImport = 'assetBatchImport',
  AssetBatchExport = 'assetBatchExport',
  UpdateBusi = 'updateBusi',
  RemoveBusi = 'removeBusi',
  UpdateNote = 'updateNote',
  Delete = 'delete',
  ChangeOrganize = 'changeOrganize',
  None = 'none',
  TurnOnMonitoring = 'turnOnMonitoring', //启用监控
  DisableMonitoring = 'disableMonitoring', //禁止监控
}
let queryFilter = [
  { name: 'monitoring_name', label: '监控名称', type: 'input' },
  { name: 'name', label: '资产名称', type: 'input' },
  { name: 'status', label: '监控状态', type: 'select' },
  { name: 'ip', label: 'IP地址', type: 'input' },
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

function isValidMonitorTissueId(tissueId: unknown): boolean {
  if (tissueId == null || tissueId === '') return false;
  if (tissueId === -1 || tissueId === '-1') return false;
  if (Number(tissueId) === -1) return false;
  return true;
}

/** 根据当前选中（叶子父分组 parId 或仅分组 tissueId）计算应在监控组织树中展开的节点 id */
function getMonitorTreeExpandIdsForSelection(
  treeList: any[],
  parId: unknown,
  tissueId: unknown,
): Set<number | string> {
  const firstLevel = new Set(treeList.map((n: any) => n.id));
  let targetId: number | string | null = null;
  if (parId != null && String(parId) !== '') {
    targetId = parId as number | string;
  } else if (isValidMonitorTissueId(tissueId)) {
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
  const [list, setList] = useState<any[]>([]);
  const audioRef = useRef(null);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [selectedAssetsName, setSelectedAssetsName] = useState<string[]>([]);
  const [treeData, setTreeData] = React.useState<DataNode[]>();
  const [treeList, setTreeList] = useState<any>([])
  const [refreshLeft, setRefreshLeft] = useState<string>(_.uniqueId('refresh_left'));
  const [optionColumns, setOptionColumns] = useState<any[]>([]);
  const [parId, setParId] = useLocalStorage('left_parId')
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  // const [current, setCurrent] = useLocalStorage<any>('monitors_list_current', 1);
  const [current, setCurrent] = useState<number>(1);
  const [pageSize, setPageSize] = useLocalStorage<any>('monitors_list_page', 10);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [filterOptions, setFilterOptions] = useState<any>({});
  const [defaultValues, setDefaultValues] = useState<string[]>();
  const [total, setTotal] = useState<number>(0);
  const [assetInfo, setAssetInfo] = useState<any>({});
  const [props, setProps] = useState<any>({});
  const [initData, setInitData] = useState({});
  const [formData, setFormData] = useState<any>({});
  const [businessForm, setBusinessForm] = useState<any>({});
  const { search } = useLocation();
  const location = useLocation();
  const { assetId } = queryString.parse(search);
  const [currentAssetId, setCurrentAssetId] = useState<number>(assetId != null ? parseInt(assetId.toString()) : 0);
  // 当页面通过 url 带了 assetId 时，只在首次进入时根据该 asset 初始化 typeId/searchVal；
  // 避免后续点击左侧组织树触发 getTableData 后重复覆盖，从而产生“双接口调用”。
  const didInitAssetIdRef = useRef(false);
  // 只有当用户实际点击了左侧组织树后，才允许在带 assetId 的情况下也传递 assetType 参数
  // （避免改变你“首次进入带 assetId”的原始请求参数行为）。
  const didClickTreeRef = useRef(false);
  // 若从其它页面跳转过来未携带 assetId：首次请求列表时不应该带上本地缓存的 typeId（assetType）
  const skipTypeIdOnFirstFetchRef = useRef<boolean>(assetId == null);

  const [secondAddButton, setSecondAddButton] = useState<boolean>(true);
  const [collapse, setCollapse] = useState(localStorage.getItem('left_monitor_list') === '1');
  const [width, setWidth] = useLocalStorage<any>('left_monitor_width', 200);
  const [expandedKeys, setExpandedKeys] = useState<any[]>([]);
  // 树展开状态提升到页面级：仅页面刷新或重新进入路由时展开第一层，其余保持最新状态
  const [assetTreeExpandedIds, setAssetTreeExpandedIds] = useState<Set<number | string>>(() => new Set());
  const assetTreeInitialExpandDone = useRef(false);
  const [typeId, setTypeId] = useLocalStorage<any>('monitors_type_id', 0);
  const [filterParam, setFilterParam] = useLocalStorage<any>('monitors_filter_param', 'ip');
  const [filterParam2, setFilterParam2] = useLocalStorage<any>('monitors_filter_param2', 'asset_ip');
  const [searchVal, setSearchVal] = useLocalStorage<any>('monitors_filter_value', null);
  const [filterType, setFilterType] = useLocalStorage<any>('monitors_filter_type', "input");
  const history = useHistory();
  const [unitOptions, setUnitOptions] = useState<any>(unitTypes);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));

  const { busiGroups, profile, permList } = useContext(CommonStateContext);
  const [open, setOpen] = useState<boolean>(false)
  const [curGroup, setCurGroup] = useState<any>({})
  const [title, setTitle] = useState<any>('');
  const [level, setLevel] = useState<number | undefined>(undefined);  // 资产组织树新增分组层级
  const [parentId, setParentId] = useState(null);  // 资产组织树新增分组父级id
  const [isAllAssets, setIsAllAssets] = useLocalStorage('left_asset_isallassets', false); // 资产组织树点击的是否是全部资产下的节点
  const [tissueId, setTissueId] = useLocalStorage('left_tissueId', Number(-1))
  // 用useRef保存递增计数器（每个组件实例独立，不共享）
  const requestIdCounter = useRef(0);
  const groupIds = busiGroups?.map(item => item.id)
  let treeQuery = {}

  const onSelectNone = () => {
    setSelectedAssets([]);
    setSelectedAssetsName([]);
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
      <Tooltip placement='top' title={renderHeaderHelpContent(field, description)}>
        <span
          className='asset-header-help-icon'
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <QuestionCircleOutlined />
        </span>
      </Tooltip>
    </span>
  );

  const getColumnLabel = (column: any) => {
    if (column?.columnLabel) {
      return column.columnLabel;
    }
    return typeof column?.title === 'string' ? column.title : '';
  };

  const baseColumns: any[] = [
    {
      title: '监控名称',
      dataIndex: 'monitoring_name',
      fixed: 'left',
      // width: "80px",
      ellipsis: true,
      render(value, record, index) {
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              showModal('asset', record.id, 'view');
            }}
          >
            {value}
          </div>
        );
      },
      sorter: (a, b) => {
        return a.monitoring_name.localeCompare(b.monitoring_name);
      },
    },
    {
      title: '资产名称',
      dataIndex: 'asset_name',
      fixed: 'left',
      align: 'center',
      ellipsis: true,
      render(value, record, index) {
        let name = assetInfo[record.asset_id]?.name;
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${record.asset_id}&asset_id=${record.asset_id}&action=asset&prom=1`);
            }}
          >
            {name}
          </div>
        );
      },
      sorter: (a, b) => {
        const aip = assetInfo[a.asset_id]?.name;
        const bip = assetInfo[b.asset_id]?.name;
        if (aip != null && bip != null) {
          return aip.localeCompare(bip);
        }
      },
    },
    {
      title: 'IP地址',
      // width: "100px",
      dataIndex: 'asset_id',
      fixed: 'left',
      align: 'center',
      ellipsis: true,
      render(value, record, index) {
        let name = assetInfo[value]?.ip;
        return (
          <div
            style={{ color: '#2B7EE5', cursor: 'pointer' }}
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${value}&asset_id=${value}&action=asset&prom=1`);
            }}
          >
            {name}
          </div>
        );
      },
      sorter: (a, b) => {
        const aip = assetInfo[a.asset_id]?.ip;
        const bip = assetInfo[b.asset_id]?.ip;
        if (aip != null && bip != null) {
          return aip.localeCompare(bip);
        }
      },
    },
  ];
  const rawChooooseColumns = [
    {
      title: '描述',
      width: '105px',
      align: 'center',
      dataIndex: 'remark',
      ellipsis: true,
    },
    {
      title: '监控状态',
      width: 120,
      ellipsis: true,
      align: 'center',
      dataIndex: 'status',
      render(value, record, index) {
        return value == 0 ? '关闭' : '正常';
      },
      sorter: (a, b) => {
        return a.status > b.status ? 1 : -1;
      },
    },
    {
      title: '更新时间',
      width: 120,
      dataIndex: 'updated_at',
      align: 'center',
      render(text, record, index) {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => {
        return a.updated_at > b.updated_at ? 1 : -1;
      },
    },
    {
      title: '更新人',
      width: 120,
      dataIndex: 'updated_by',
      align: 'center',
      render(text, record, index) {
        return text;
      },
    },
  ];
  const choooseColumns = rawChooooseColumns.map((column) => {
    if (column.dataIndex !== 'status') {
      return column;
    }
    return {
      ...column,
      columnLabel: '监控状态',
      title: renderHeaderHelpTitle('监控状态', '监控状态', '反映资产对应指标检测是否正常的状态。'),
    };
  });
  const fixColumns: any[] = [
    {
      title: '操作',
      width: 300,
      align: 'center',
      fixed: 'right',
      render: (val, record: any) => (
        <Space>
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/status")) && <PoweroffOutlined
              title={record.status == 1 ? '正常' : '失效'}
              style={{ color: record.status === 1 ? 'green' : 'red' }}
              onClick={(e) => {
                let key = new Array();
                key.push(record.id);
                if (record.status == 0) {
                  Modal.confirm({
                    title: '确认要启用当前选择监控？',
                    onOk: async () => {
                      updateMonitorStatus(1, key, 1).then((res) => {
                        message.success('修改成功');
                        setRefreshFlag(_.uniqueId('refreshFlag_'));
                      });
                    },
                    onCancel() { },
                  });
                } else {
                  Modal.confirm({
                    title: '确认要关闭当前选择监控？',
                    okText: '确定',
                    cancelText: '取消',
                    onOk: async () => {
                      updateMonitorStatus(0, key, 1).then((res) => {
                        message.success('修改成功');
                        setRefreshFlag(_.uniqueId('refreshFlag_'));
                      });
                    },
                    onCancel() { },
                  });
                }
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/rules")) && <FileProtectOutlined
              title='查看资产告警规则'
              onClick={() => {
                showModal('rules', record.asset_id, 'view');
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/detail")) && <FileSearchOutlined
              title='查看监控配置'
              onClick={() => {
                showModal('asset', record.id, 'view');
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/explorer")) && <FundOutlined
              title='监控指标信息'
              onClick={() => {
                const query: PromVisualQuery = {
                  metric: record.monitoring_sql,
                  labels: [
                    // {
                    //   label: 'asset_id',
                    //   value: record.asset_id,
                    //   op: '=',
                    // },
                  ],
                  operations: [],
                };
                const prom_ql = renderQuery(query);
                history.push({
                  pathname: '/metric/explorer',
                  search: queryString.stringify({
                    prom_ql: prom_ql,
                    data_source_name: 'prometheus',
                    data_source_id: record.datasource_id,
                    mode: 'graph',
                    start: moment().subtract(30, 'minutes').unix(),
                    end: moment().add(30, 'minutes').unix(),
                  }),
                  state: { isops: true },
                });
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/put")) && <EditOutlined
              title='编辑监控信息'
              onClick={() => {
                showModal('asset', record.id, 'edit');
              }}
            />
          }
          {
            (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/del")) && <DeleteOutlined
              title='删除监控信息'
              onClick={() => {
                Modal.confirm({
                  title: t('common:confirm.delete'),
                  okText: '确定',
                  cancelText: '取消',
                  onOk: async () => {
                    deleteXhMonitor(record.id).then((res) => {
                      message.success('删除成功');
                      setRefreshFlag(_.uniqueId('refreshFlag_'));
                      getAssetTree()
                    });
                  },
                  onCancel() { },
                });
              }}
            />
          }






        </Space>
      ),
    },
  ];

  const [selectColum, setSelectColum] = useState<any[]>();

  const { components, resizableColumns, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => selectColum, [selectColum]),
    columnsState: {
      persistenceType: 'localStorage',
      persistenceKey: `dashboard-table-resizable-xh-monitor-management`,
    },
  });
  function handelShowColumn(checkedValues) {
    let showColumns = new Array();
    optionColumns.forEach((item) => {
      if (checkedValues.includes(getColumnLabel(item))) {
        showColumns.push(item);
      }
    });
    setSelectColum(showColumns.concat(fixColumns));
  }

  // const getAssetTree = () => {
  //   getMonitorAssetstypes(treeQuery).then((res) => {
  //     filterOptions['asset_type'] = res.dat.map((v) => {
  //       return {
  //         value: v.name,
  //         label: v.name,
  //       };
  //     });
  //     setFilterOptions({ ...filterOptions });

  //     const items = res.dat.map((v) => {
  //       return {
  //         id: v.name,
  //         name: v.name,
  //         ...v,
  //       };
  //     });
  //     let treeData: any[] = [
  //       {
  //         id: 0,
  //         name: '全部资产',
  //         count: 0,
  //         children: items,
  //       },
  //     ];
  //     const types = items.map((v) => {
  //       return {
  //         value: v.name,
  //         label: v.name,
  //         ...v,
  //       };
  //     });
  //     setAssetTypes(types);
  //     let arr = ['0'];
  //     items.map((item, index) => {
  //       arr.push(item.id);
  //     });
  //     setExpandedKeys(arr);
  //     setTreeData(_.cloneDeep(treeData));
  //   });
  // }

  const getAssetTree = () => {
    // console.log('ac', activeColor);
    // console.log('parId', parId);
    // console.log('left_asset_type', localStorage.getItem('left_asset_type'));

    // console.log('treeQuery', treeQuery);
    // treeQuery['status'] = 0
    // treeQuery['groupIds'] = groupIds?.toString()
    // treeQuery['query'] = searchVal?searchVal:undefined;
    // treeQuery['filter'] = filterParam?filterParam:undefined;
    if (searchVal != null && searchVal.length > 0) {
      treeQuery['query'] = searchVal
    }
    if (filterParam2 != null && filterParam2.length > 0 && searchVal != null && searchVal.length > 0) {
      treeQuery['filter'] = filterParam2;
    }
    getMonitortree(treeQuery).then(res => {
      // getAssetstypesNew(treeQuery).then(res => {
      const { dat } = res
      // dat.forEach(item => {
      //   item['type_list'] = item['type_list'].map((v) => {
      //     return {
      //       id: v.name,
      //       name: v.name,
      //       ...v,
      //       parentId: item.id
      //     };
      //   });
      // })
      // console.log('dat', dat);
      // setTreeList(dat)
      const processDat = sortAndProcessTypeList(dat)
      // console.log('dat', processDat);
      setTreeList(processDat)
    })
  }
  const AssetTree = ({ data, expandedIds, setExpandedIds }) => {
    // 资产组织树：展开状态由页面传入，仅在首轮初始化完成后才持久化到 localStorage，避免覆盖历史展开记录
    useEffect(() => {
      if (!assetTreeInitialExpandDone.current) return;
      // 首次渲染 expandedIds 可能是空 Set，若此时写入 localStorage，会覆盖离开前的展开状态
      if (!expandedIds || expandedIds.size === 0) return;
      localStorage.setItem('expandedIds', JSON.stringify([...expandedIds]));
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
  /** 资产树组件 */
  // isAllAssets：一个布尔值，用于标记当前节点是否是"全部资产"的子节点。
  const TreeNode = ({ item, expandedIds, onToggle, isAllAssets = false }) => {
    const isExpanded = expandedIds.has(item.id);
    return (
      <div key={item.name} className="tree-row">
        <div
          className="tree-group"
          style={{ marginLeft: `${(item.group_level - 1) * 20}px` }}
        >
          <span
            onClick={() => {
              onToggle(item.id);
            }}
          >
            {isExpanded ? (
              <MinusSquareOutlined style={{ fontSize: 13 }} />
            ) : (
              <PlusSquareOutlined style={{ fontSize: 13 }} />
            )}
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
            {item.name}
          </span>
          {item.id != -1 && !isAllAssets && (
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
                              localStorage.removeItem("left_parId");
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
                    ...((profile.roles?.includes('Admin') || permList.includes('/xh/monitor/addGroup')) && item.group_level < 3 && !item.type_list?.length
                      ? [
                        {
                          key: "add-sub",
                          label: "新增分组",
                          icon: <PlusOutlined />,
                        },
                      ]
                      : []),
                    (profile.roles?.includes('Admin') || permList.includes('/xh/monitor/editGroup')) && { key: "edit", label: "编辑", icon: <EditOutlined /> },
                    (profile.roles?.includes('Admin') || permList.includes('/xh/monitor/delGroup')) && { key: "del", label: "删除", icon: <DeleteOutlined /> },
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
          item.sub_groups?.length > 0 &&
          item.sub_groups.map((child) => {
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
  const handleClickTree = (item: any, par: any, isAllAssets: boolean) => {
    // 是否是全部资产下的节点点击
    setIsAllAssets(isAllAssets)
    if (par) {
      setParId(par.id)
      setTypeId(item.id);
      setTissueId(undefined)
    } else {
      setTissueId(item.id)
      setTypeId(undefined)
      localStorage.removeItem('left_parId')
      setParId(undefined)
    }
    // console.log(item);
    // setActiveColor(item.id)
    //资产类型操作
    setCurrent(1);
    localStorage.setItem('left_asset_type', item.id);
    // 标记：只有用户点击左侧树后，才允许在带 assetId 的模式下补上传 assetType
    didClickTreeRef.current = true;
    setRefreshKey(_.uniqueId('refreshKey_'));
  }
  useEffect(() => {
    setSecondAddButton(false);
    setOptionColumns(baseColumns.concat(choooseColumns));
    let modelIds = Array.from(new Set(baseColumns.concat(choooseColumns).map((obj) => getColumnLabel(obj))));
    setDefaultValues(modelIds);
    setSelectColum(baseColumns.concat(choooseColumns).concat(fixColumns));
    getAssetstypes().then(({ dat }) => {
      const types = dat.map(item => item.name).toString()
      getAssetsByMonitor({ limit: -1, types }).then(({ dat }) => {
        dat.forEach((v) => {
          assetInfo[v.id] = v;
        });
        setAssetInfo({ ...assetInfo });
        getTableData(assetInfo, unitTypes);
      });
    });
    filterOptions['status'] = [
      { value: '0', label: '关闭' },
      { value: '1', label: '正常' },
    ];
    filterOptions['is_alarm'] = [
      { value: '1', label: '已启用' },
      { value: '0', label: '未启用' },
    ];
    setFilterOptions({ ...filterOptions });
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
      // loadingGroupColumns(items);
      setTreeData(_.cloneDeep(treeData));
      // getAssetTree()
    });
  }, []);

  useEffect(() => {
    getTableData(assetInfo, unitOptions);
  }, [searchVal, refreshFlag, typeId, refreshKey]);

  useEffect(() => {
    didInitAssetIdRef.current = false;
    didClickTreeRef.current = false;
  }, [currentAssetId]);

  useEffect(() => {
    getAssetTree()
  }, [searchVal]);

  useEffect(() => {
    if (!treeList?.length || assetTreeInitialExpandDone.current) return;
    assetTreeInitialExpandDone.current = true;

    const fromOpsForm = (location.state as { isops?: boolean } | null)?.isops === true;
    console.log('fromOpsForm', fromOpsForm);
    

    // 从监控表单返回（携带 state.isops）时：按照当前选中分组/类型恢复展开 + 合并历史 expandedIds
    if (fromOpsForm) {
      const pathExpand = getMonitorTreeExpandIdsForSelection(treeList, parId, tissueId);
      const merged = new Set(pathExpand);
      try {
        const raw = localStorage.getItem('expandedIds');
        if (raw) {
          const ids = JSON.parse(raw) as (number | string)[];
          if (Array.isArray(ids)) {
            ids.forEach((id) => merged.add(id));
          }
        }
      } catch {
        // ignore
      }
      setAssetTreeExpandedIds(merged);
      return;
    }

    // 首次挂载且树数据到位时：
    // - 没有 currentAssetId（正常从菜单进来）：默认展开第一层
    // - 有 currentAssetId（外部带 assetId 进来）：从 localStorage.expandedIds 恢复展开状态
    if (currentAssetId && currentAssetId > 0) {
      try {
        const saved = localStorage.getItem('expandedIds');
        if (saved) {
          const arr = JSON.parse(saved || '[]');
          setAssetTreeExpandedIds(new Set(arr));
          return;
        }
      } catch (e) {
        // ignore parse error and fall back to 默认展开第一层
      }
    }
    setAssetTreeExpandedIds(new Set(treeList.map((node: any) => node.id)));
  }, [treeList, currentAssetId]);

  const getTableData = (assets, units) => {
    // 1. 生成当前请求的唯一ID（组件内独立递增）
    const requestId = ++requestIdCounter.current;
    const param = {
      page: current,
      limit: pageSize,
      gId: groupIds?.toString()
    };

    if (currentAssetId > 0) {
      param['assetId'] = currentAssetId;
    } else {
      if (searchVal != null && searchVal.length > 0) {
        param['query'] = searchVal;
        treeQuery['query'] = searchVal
      }
      if (filterParam2 != null && filterParam2.length > 0 && searchVal != null && searchVal.length > 0) {
        param['filter'] = filterParam2;
        treeQuery['filter'] = filterParam2;
      }
      // if (currentAssetId <= 0 && typeId != null && typeId + '' != '0') {
      //   param['assetType'] = typeId;
      // }
    }


    // 使用 state 的 parId，避免点击树时 setParId 刚触发但 localStorage 还没写入导致缺参
    const parentId = parId != null ? parId : localStorage.getItem('left_parId')
    // 未带 assetId 首次进入页面时：不带 assetType（TypeId）做首次查询，避免“进来就被历史 typeId 过滤”
    const shouldSkipAssetTypeThisFetch = skipTypeIdOnFirstFetchRef.current && currentAssetId <= 0;
    // 当 URL 带 assetId 时（currentAssetId > 0），点击树节点后也应补上传 assetType
    if (
      !shouldSkipAssetTypeThisFetch &&
      typeId != null &&
      typeId + '' != '0' &&
      parentId &&
      (currentAssetId <= 0 || didClickTreeRef.current)
    ) {
      param['assetType'] = typeId;
    }
    if (tissueId != null && !parentId) {
      param['group_id'] = tissueId;
    }
    // 点击全部资产下的查询时，group_id传-1
    if (isAllAssets) {
      param["group_id"] = -1;
      // 根据tissueId的值 查找对应的type_list
      if (tissueId != null && !parentId) {
        const treeItem = treeList
          .find((item) => item.id === -1)
          ?.sub_groups?.find((item) => item.id === tissueId);
        // console.log('treeItem', treeItem);
        const typeListNames = treeItem?.type_list
          ?.map((item) => item.name)
          .join(",");
        if (typeListNames) {
          param["types"] = typeListNames;
        } else {
          param["types"] = "";
        }
      }
    }


    // 只跳过第一次
    if (skipTypeIdOnFirstFetchRef.current) skipTypeIdOnFirstFetchRef.current = false;

    getMonitorInfoList(param).then(({ dat }) => {
      dat.list.forEach((entity) => {
        if (entity.unit != null && entity.unit.length > 0 && units[entity.unit]) {
          entity['unit_name'] = units[entity.unit];
        } else {
          entity['unit_name'] = '';
        }
        return entity;
      });
      // setList(dat.list);
      // setTotal(dat.total);
      if (requestId === requestIdCounter.current) {
        setList(dat.list || []);
        setTotal(dat.total);
      }
      // 当通过 URL 带 assetId 进入时，只需要初始化一次 typeId/searchVal；
      // 后续点击左侧组织树也会触发 getTableData，从而重复 getXhAsset 并造成二次接口调用。
      if (currentAssetId > 0 && !didInitAssetIdRef.current) {
        didInitAssetIdRef.current = true;
        getXhAsset('' + currentAssetId).then(({ dat }) => {
          setTypeId(dat.type);
          setFilterParam('ip');
          setFilterType('input');
          setSearchVal(dat.ip);
        });
      }
    });
  };
  const handleClose = (value: any) => {
    if (value == 'sure') {
      getAssetTree()
    }
    setOpen(false)
  }
  const pupupContent = (
    <div>
      <Checkbox.Group defaultValue={defaultValues} style={{ width: '100%' }} onChange={handelShowColumn}>
        {optionColumns.map((item) => (
          <Row key={getColumnLabel(item)} style={{ marginBottom: '5px' }}>
            <Col span={24}>
              <Checkbox value={getColumnLabel(item)}>{getColumnLabel(item)}</Checkbox>
            </Col>
          </Row>
        ))}
      </Checkbox.Group>
    </div>
  );

  const showModal = (action: string, id: any, operate: string) => {
    if (action == 'asset') {
      let url = '/xh/monitor/add?type=asset&action=' + operate;
      if (id == 0) {
        history.push(url);
      } else {
        history.push(url + '&id=' + id);
      }
    } else if (action == 'monitor') {
      history.push(`/xh/monitor/add?type=monitor&id=${id}&action=monitor`);
    } else if (action == 'rules') {
      let asset = assetInfo[id];
      history.push({
        pathname: `/alert-rules`,
        search: `?id=${asset.group_id}&&asset_id=${id}`,
        state: { isops: true },
      });
    }
  };
  const titleRender = (node) => {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>{node.name}</span>
          <span>{node?.number}</span>
          {/* {node.id > 0 && (
            <Fragment>
              <span style={{ marginLeft: '5px' }} className='tree_node_count'>
                {' '}
                ({node.count})
              </span>
            </Fragment>
          )} */}
        </span>
      </div>
    );
  };

  const onPageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
    setRefreshKey(_.uniqueId('refreshKey_'));
  };

  const onSelect = (selectedKeys, info) => {
    console.log(filterParam);

    setTypeId(selectedKeys[0]);
    setCurrentAssetId(0);
    setCurrent(1)
    if (filterParam == 'status') {
      setFilterType("select");
    } else {
      setFilterType("input");
    }
    // setFilterParam("asset_ip");

    // setSearchVal(null);
    setRefreshKey(_.uniqueId('refreshKey_'));
  };
  return (
    <PageLayout icon={<GroupOutlined />} title={'监控管理'} showBack={assetId ? true : false}  backPath="/xh/assetmgt" backState={{ isops: true }}>
      <div style={{ display: 'flex' }} className='monitor_list_view'>
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
          }}
        >
          <div className={collapse ? 'left-area collapse' : 'left-area'}>
            <div
              className='collapse-btn'
              onClick={() => {
                localStorage.setItem('left_monitor_list', !collapse ? '1' : '0');
                setCollapse(!collapse);
              }}
            >
              {!collapse ? <LeftOutlined /> : <RightOutlined />}
            </div>
            <div className='left_tree' style={{ display: 'inline-block' }}>
              <div className='asset_organize_cls'>
                <span>组织树列表</span>
                {
                  (profile.roles?.includes('Admin') || permList.includes('/xh/monitor/addGroup')) && <span
                    className="add_group"
                    onClick={() => {
                      setOpen(true);
                      setCurGroup({});
                      setTitle("新增分组");
                      setLevel(1);
                      setParentId(null);
                    }}
                  >
                    新增分组
                  </span>
                }
              </div>
              <div className='tree-list'>
                {expandedKeys && treeList && (
                  <AssetTree data={treeList} expandedIds={assetTreeExpandedIds} setExpandedIds={setAssetTreeExpandedIds} />
                  // <Tree
                  //   showLine={true}
                  //   showIcon={true}
                  //   style={{ marginTop: 0 }}
                  //   titleRender={titleRender}
                  //   defaultExpandedKeys={expandedKeys}
                  //   treeData={treeData}
                  //   defaultExpandAll={true}
                  //   defaultSelectedKeys={[typeId]}
                  //   selectedKeys={[typeId]}
                  //   autoExpandParent={true}
                  //   checkStrictly
                  //   fieldNames={{ key: 'id', title: 'name' }}
                  //   onSelect={onSelect}
                  // />
                )}
              </div>
            </div>
          </div>
        </Resizable>
        <div className='monitor-operate_xh'>
          <div className='table-content_xh'>
            <Space size={"small"}>
              <RefreshIcon
                onClick={() => {
                  setRefreshKey(_.uniqueId('refreshKey_'));
                }}
              />

              <div className='table-handle-search'>
                <Select
                  placeholder="选择过滤器"
                  style={{ width: 120, marginRight: '10px' }}
                  defaultValue={filterParam}
                  onChange={(value) => {
                    queryFilter.forEach((item: any) => {
                      if (item.name == value) {
                        setFilterType(item.type);
                      }
                    });
                    setFilterParam(value);
                    if (value == 'ip') {
                      setFilterParam2('asset_ip');
                    }
                    if (value == 'name') {
                      setFilterParam2('asset_name');
                    }
                    setFilterParam2(value);
                    setSearchVal(null);
                    setCurrentAssetId(0);
                    setCurrent(1);
                  }}
                >
                  {queryFilter.map((item, index) => {
                    return (
                      <Select.Option value={item.name} key={index}>
                        {item.label}
                      </Select.Option>)
                  })}
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
                      setCurrentAssetId(0);
                      setCurrent(1);
                    }}
                    suffix={<SearchOutlined />}
                    placeholder={'输入模糊检索关键字'}
                  />
                )}
                {filterType == 'select' && (
                  <Select
                    className={'searchInput'}
                    value={searchVal}
                    allowClear
                    options={filterOptions[filterParam] ? filterOptions[filterParam] : []}
                    onChange={(val) => {
                      if (val != undefined) {
                        setSearchVal(val);
                      } else {
                        setSearchVal(null);
                      }
                      setCurrentAssetId(0);
                      setCurrent(1);
                    }}
                    placeholder={'选择要查询的条件'}
                  />
                )}
              </div>
            </Space>
            <div className='tool_right'>
              {
                (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/add")) && <div>
                  <Button
                    className='tool_rightbtn'
                    onClick={() => {
                      showModal('asset', currentAssetId, 'add');
                    }}
                    type='primary'
                  >
                    {t('新增')}
                  </Button>
                  &nbsp; &nbsp; &nbsp;
                </div>
              }
              {
                (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/col")) && <div>
                  <Popover placement='bottom' content={pupupContent} trigger='click' className='filter_columns'>
                    <Button className='show_columns' icon={<UnorderedListOutlined />}>
                      显示列
                    </Button>
                    &nbsp; &nbsp; &nbsp;
                  </Popover>
                </div>
              }
              {
                (profile.roles?.includes("Admin") || permList.includes("/xh/monitor/ops")) && <div>
                  <Dropdown
                    trigger={['click']}
                    overlay={
                      <Menu
                        style={{ width: '100px' }}
                        onClick={({ key }) => {
                          if ('assetBatchImport' == key) {
                            history.push('/xh/monitor/muti/add');
                          } else {
                            if (selectedAssets.length <= 0) {
                              message.error('未选中监控信息');
                              return;
                            }
                            if (key == 'delete') {
                              Modal.confirm({
                                title: '确认要强制删除当前选中的监控信息？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  deleteXhBatchMonitor({ ids: selectedAssets.toString().split(',') }).then((res) => {
                                    message.success('删除成功');
                                    setRefreshFlag(_.uniqueId('refreshFlag_'));
                                    getAssetTree()
                                  });
                                },
                                onCancel() { },
                              });
                            } else if (key == 'turnOnMonitoring') {
                              Modal.confirm({
                                title: '确认要启用当前选择监控？',
                                onOk: async () => {
                                  updateMonitorStatus(1, selectedAssets, 1).then((res) => {
                                    message.success('修改成功');
                                    setOperateType(OperateType.None);
                                    setRefreshFlag(_.uniqueId('refreshFlag_'));
                                    onSelectNone();
                                  });
                                },
                                onCancel() { },
                              });
                            } else if (key == 'disableMonitoring') {
                              Modal.confirm({
                                title: '确认要禁止当前选择监控？',
                                okText: '确定',
                                cancelText: '取消',
                                onOk: async () => {
                                  updateMonitorStatus(0, selectedAssets, 1).then((res) => {
                                    message.success('修改成功');
                                    setOperateType(OperateType.None);
                                    setRefreshFlag(_.uniqueId('refreshFlag_'));
                                    onSelectNone();
                                  });
                                },
                                onCancel() { },
                              });
                            } else {
                              setOperateType(key as OperateType);
                            }
                          }
                        }}
                        items={[
                          { key: OperateType.TurnOnMonitoring, label: '启用监控' },
                          { key: OperateType.DisableMonitoring, label: '禁止监控' },
                          // { key: OperateType.AssetBatchImport, label: '批量添加' },
                          { key: OperateType.Delete, label: '批量删除' },
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


            </div>

          </div>
          <div className='renderer-table-container'>
            <div className='monitor-list renderer-table-container-box'>
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
                  selectedRowKeys: selectedAssets,
                }}
                pagination={{
                  showSizeChanger: true,
                  showQuickJumper: true,
                  current: current,
                  pageSize: pageSize,
                  total: total,
                  onChange: onPageChange,
                  showTotal: (total) => `总共 ${total} 条`,
                  pageSizeOptions: [10, 20, 50, 100],
                }}
                rowKey='id'
                size='small'
              ></Table>
              <CommonModal
                Modal={props.Modal}
                Form={props.Form}
                initial={initData}
                defaultValue={formData}
                isInline={props.isInline}
                operate={businessForm.operate}
                isOpen={businessForm.isOpen}
              ></CommonModal>
              <OperationModal
                operateType={operateType}
                setOperateType={setOperateType}
                assets={selectedAssets}
                names={selectedAssetsName}
                reloadList={() => {
                  setRefreshKey(_.uniqueId('refreshKey_'));
                }}
              />
            </div>
          </div>
        </div>
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
