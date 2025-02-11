import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Popover, Checkbox, Row, Col, Select, Tooltip } from 'antd';
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
  RightOutlined,
  SearchOutlined,
  SyncOutlined,
  UnorderedListOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import './locale';
import './style.less';
import _ from 'lodash';
import { Resizable } from 're-resizable';
import Accordion from './Accordion';
import { assetsType, metricsUnitEnum } from '@/store/assetsInterfaces';
import { CommonStateContext } from '@/App';
import { deleteXhAssets, getAssetstypes, getAssetsByCondition } from '@/services/assets';

import RefreshIcon from '@/components/RefreshIcon';
import { Link, useHistory } from 'react-router-dom';
import { OperationModal } from './OperationModal';
import { factories } from './catalog';
import type { DataNode, TreeProps } from 'antd/es/tree';
import { useInterval, useLocalStorage } from 'react-use';
import { settings } from 'cluster';

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
}
let queryFilter = [
  { name: 'ip', label: 'IP地址', type: 'input' },
  { name: 'name', label: '资产名称', type: 'input' },
  { name: 'manufacturers', label: '厂商', type: 'select' },
  { name: 'os', label: '操作系统', type: 'input' },
  { name: 'status', label: '管理状态', type: 'select' },
  { name: 'group_id', label: '业务组', type: 'select' },
  { name: 'position', label: '资产位置', type: 'input' },
  { name: 'maintenanceStatus', label: '维保状态', type: 'select' },
];

export default function () {
  const { t } = useTranslation('assets');
  const history = useHistory();

  const [list, setList] = useState<any[]>([]);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [selectedAssetsName, setSelectedAssetsName] = useState<string[]>([]);
  const [treeData, setTreeData] = React.useState<DataNode[]>();
  const [filterType, setFilterType] = useLocalStorage<any>('asset_filter_type', 'input');
  const [current, setCurrent] = useLocalStorage('asset_current_from', 1);
  const [pageSize, setPageSize] = useLocalStorage('asset_current_page', 10);
  const [searchVal, setSearchVal] = useLocalStorage<any>('asset_filter_value', null);
  const [filterParam, setFilterParam] = useLocalStorage<any>('asset_filter_param', 'ip');
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));

  const [metricUnits, setMetricUnits] = useState<any>({});

  const [total, setTotal] = useState<number>(0);

  const { busiGroups } = useContext(CommonStateContext);

  const [collapse, setCollapse] = useState(localStorage.getItem('left_asset_list') === '1');
  const [width, setWidth] = useState(_.toNumber(localStorage.getItem('leftassetWidth') || 200));
  const [typeId, setTypeId] = useLocalStorage('monitor_current_type_id', '0');
  const [assetTypes, setAssetTypes] = useState<any[]>([]);

  const [expandedKeys, setExpandedKeys] = useState<any[]>();
  const [modifyType, setModifyType] = useState<boolean>(true);
  const [queryCondition, setQueryCondition] = useState<any>({});
  const groupIds = busiGroups?.map(item => item.id)
  // console.log(groupIds);
  
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
    manufacturers: factories.map((factory) => {
      return {
        value: _.toString(factory.value),
        label: factory.value,
      };
    }),
    maintenanceStatus:maintenanceStatusOption.map((factory) => {
      return {
        value: _.toString(factory.value),
        label: factory.label,
      };
    }),
  };
  

  const baseColumns: any[] = [
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
      title: '资产类型',
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
      title: '管理状态',
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
            <Tag icon={< SyncOutlined/>} color='processing'>
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
            <Tag icon={<CloseCircleOutlined  spin />} color='warning'>
              待维保
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
  ];

  const fixColumns: any[] = [
    {
      title: '操作',
      width: 200,
      align: 'center',
      fixed: 'right',
      render: (text: string, record: assetsType) => (
        <Space>
          <VideoCameraOutlined
            title='设置监控'
            onClick={(e) => {
              localStorage.setItem('left_monitor_type', '0');
              history.push('/xh/monitor?mode=view&assetId=' + record.id);
            }}
          />
          <FileSearchOutlined
            title='资产详情'
            onClick={(e) => {
              showModal('view', record);
            }}
          />
          <FundOutlined
            title='监控图表'
            onClick={(e) => {
              history.push(`/xh/monitor/add?type=monitor&id=${record.id}&asset_id=${record.id}&action=asset&prom=1`);
            }}
          />
          <EditOutlined
            title='编辑'
            onClick={(e) => {
              showModal('update', record);
            }}
          />
          <DeleteOutlined
            title='删除'
            className='table-operator-area-warning'
            onClick={async () => {
              Modal.confirm({
                title: t('common:confirm.delete'),
                onOk: async () => {
                  await deleteXhAssets({ ids: [record.id.toString()] });
                  message.success(t('common:success.delete'));
                  setRefreshKey(_.uniqueId('refreshKey_'));
                  setSelectedAssets([]);
                },

                onCancel() {},
              });
            }}
          ></DeleteOutlined>
        </Space>
      ),
    },
  ];

  // 列处理
  const [groupedColumns, setGroupedColumns] = useState<any>({});
  const [defaultValues, setDefaultValues] = useLocalStorage<string[]>('ASSET_SELECTED_COLUMNS', Array.from(new Set(baseColumns.map((obj) => obj.title))));
  const [optionColumns, setOptionColumns] = useState<any[]>(baseColumns); // 可选列
  const [selectColumns, setSelectColumns] = useState<any[]>(baseColumns.concat(fixColumns));
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
    const newSelectedColumns = optionalColumns.filter((v) => defaultValues?.includes(v.title));
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
      if (checkedValues.includes(item.title)) {
        showColumns.push(item);
      }
    });
    setDefaultValues(showColumns.map((v) => v.title));
    setSelectColumns(showColumns.concat(fixColumns));
  }

  useEffect(() => {
    //来源数据字典
    getAssetstypes().then((res) => {
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
    getTableData();
  }, [searchVal, typeId, refreshKey]);

  useInterval(() => {
    setRefreshKey(_.uniqueId('refreshKey_'));
  }, 1000 * 30);

  const getTableData = () => {
    const param = {
      page: current,
      limit: pageSize,
      groupIds: groupIds?.toString()
    };

    if (searchVal != null && searchVal.length > 0) {
      param['query'] = searchVal;
    }
    if (typeId != null && typeId != '0' && modifyType) {
      param['type'] = typeId;
    }
    if (filterParam != null && filterParam.length > 0 && searchVal != null && searchVal.length > 0) {
      param['filter'] = filterParam;
    }
    setQueryCondition(param);
    getAssetsByCondition(param).then(({ dat }) => {
      dat.list.forEach((entity, index) => {
        let expands = entity.exps;
        if (expands != null && expands.length > 0) {
          const map = new Map();
          expands.forEach((item, index, arr) => {
            if (!map.has(item.config_category)) {
              map.set(
                item.config_category,
                arr.filter((a) => a.config_category == item.config_category),
              );
            }
          });
          //以上分组加载数据
          let mapValues = {};
          map.forEach(function (value, key) {
            const formDataMap = new Map();
            value.forEach((item, index, arr) => {
              if (!formDataMap.has(item.group_id)) {
                formDataMap.set(
                  item.group_id,
                  arr.filter((a) => a.group_id == item.group_id),
                );
              }
            });
            let group: any = [];
            formDataMap.forEach(function (value, i) {
              let itemsChars = '';
              value.forEach((item, index, arr) => {
                itemsChars += '"' + item.name + '":"' + item.value + '",';
              });
              itemsChars = '{' + itemsChars.substring(0, itemsChars.length - 1) + '}';
              group.push(JSON.parse(itemsChars));
            });
            mapValues[key] = group;
          });
          entity.expands = mapValues;
        }
      });
      // console.log('1111list', dat.list);
      
      setList(dat.list);
      setTotal(dat.total);
    });
  };

  const popupContent = (
    <div style={{ maxHeight: '550px', overflow: 'scroll' }}>
      <Checkbox.Group value={defaultValues} style={{ width: '100%' }} onChange={handelShowColumn}>
        {optionColumns.map((item, index) => (
          <Row key={'option' + index} style={{ marginBottom: '5px' }}>
            <Col span={24}>
              <Checkbox value={item.title}>{item.title}</Checkbox>
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
      } catch(e) {
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

  return (
    <PageLayout icon={<GroupOutlined />} title={'资产管理'}>
      <div style={{ display: 'inline-flex' }} className='asset_list_view'>
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
              <div className='asset_organize_cls'>组织树列表</div>
              <Accordion
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
              />
            </div>
          </div>
        </Resizable>
        <div className='asset-operate_xh'>
          <div className='table-content_xh'>
            <Space>
              <RefreshIcon
                onClick={() => {
                  setRefreshKey(_.uniqueId('refreshKey_'));
                }}
              />
              <div className='table-handle-search'>
                <Space>
                  <Select
                    defaultValue={filterParam}
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
                <div>
                  <Button
                    onClick={() => {
                      showModal('add', null);
                    }}
                    type='primary'
                  >
                    {t('新增')}
                  </Button>
                </div>
                <div>
                  <Popover placement='bottom' content={popupContent} trigger='click' className='filter_columns'>
                    <Button icon={<UnorderedListOutlined />}>显示列</Button>
                  </Popover>
                </div>
                <div>
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
                                    setSelectedAssets([]);
                                  });
                                },
                                onCancel() {},
                              });
                            }
                          } else if (key == OperateType.UpdateBusi) {
                            if (selectedAssets.length <= 0) {
                              message.warning('请选择要批量转移的资产');
                              return;
                            }
                            setOperateType(key as OperateType);
                          } else {
                            setOperateType(key as OperateType);
                          }
                        }}
                        items={[
                          { key: OperateType.AssetBatchImport, label: '导入设备' },
                          { key: OperateType.AssetBatchExport, label: '导出设备' },
                          // { key: OperateType.BindTag, label: '绑定标签' },
                          // { key: OperateType.UnbindTag, label: '解绑标签' },
                          { key: OperateType.UpdateBusi, label: '批量转移' },
                          // { key: OperateType.RemoveBusi, label: '移出业务组' },
                          // { key: OperateType.UpdateNote, label: '修改备注' },
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
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
