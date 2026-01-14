/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
// @ts-nocheck
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, Link } from 'react-router-dom';
import _, { concat } from 'lodash';
import moment from 'moment';
import { Table, Tag, Switch, Modal, Space, Button, Row, Col, message, Select, Tooltip, Input } from 'antd';
import RefreshIcon from '@/components/RefreshIcon';
import usePagination from '@/components/usePagination';
import { getStrategyGroupSubList, updateAlertRules,updateAlertRulesStatus, deleteStrategy,deleteAlertRules } from '@/services/warning';
import { CommonStateContext } from '@/App';
import { getAssetstypes } from '@/services/assets';
import Tags from '@/components/Tags';
import './style.less';
import { AlertRuleType, AlertRuleStatus } from '../types';
import MoreOperations from './MoreOperations';
import { CopyTwoTone, DeleteOutlined, EditOutlined, FileSearchOutlined, PoweroffOutlined, SearchOutlined } from '@ant-design/icons';
import { useAntdResizableHeader } from 'use-antd-resizable-header';
import { useLocalStorage } from 'react-use';
import { priorityColor } from '../constants';
interface ListProps {
  bgid?: number;
  assetid?: number;
  from: number;
}

let queryFilter = [
  { name: 'ip', label: 'IP地址', type: 'input' },
  { name: 'rule_name', label: '告警规则名称', type: 'input' },
  { name: 'severity', label: '告警级别', type: 'select' },
  { name: 'type', label: '资产类型', type: 'select' },
  { name: 'name', label: '资产名称', type: 'input' },
  // { name: 'alert_rule', label: '告警规则', type: 'input' },
];

interface Filter {
  cate?: string;
  datasourceIds?: number[];
  search?: string;
  query?: any;
}

export default function List(props: ListProps) {
  const { bgid, assetid, from } = props;
  const { busiGroups, profile, permList } = useContext(CommonStateContext);
  const groupIds = busiGroups?.map(item => item.id)
  const { t } = useTranslation('alertRules');
  const history = useHistory();
  const pagination = usePagination({ PAGESIZE_KEY: 'alert-rules-pagesize' });
  const [params, setParams] = useState<any>({
    limit: 10,
    page: 1,
    gid: groupIds?.toString(),
  });
  const [refreshLeft, setRefreshLeft] = useState<string>(_.uniqueId('refresh_left'));
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [selectRowKeys, setSelectRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<AlertRuleType<any>[]>([]);
  const [listTableData, setListTableData] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<string>("input");
  const [searchVal, setSearchVal] = useState<any>(null);
  const [filterParam, setFilterParam] = useState<string>('ip');
  const [filterOptions, setFilterOptions] = useState<any>({});
  // const [current, setCurrent] = useLocalStorage('rules_current_from', 1);
  const [current, setCurrent] = useState<number>(1);
  const [pageSize, setPageSize] = useLocalStorage('rules_current_page', 10);
  const [total, setTotal] = useState<number>(0);
  const [typeOptions, setTypeOptions] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const selectColumns: any[] = [
    {
      title: '告警规则名称',
      dataIndex: 'name',
      width: 250,
      // render(name, record, index) {
      //   return (
      //     <Link
      //       className='table-text'
      //       to={{
      //         pathname: `/alert-rules/edit/${record.id}`,
      //       }}
      //     >
      //       {name}
      //     </Link>
      //   );
      // },
      render(name, record, index) {
        return (
          <Link
            className='table-text'
            to={{
              pathname: `/alert-rules/edit/${record.strategy_id}?mode=view`,
            }}
          >
            {name}
          </Link>
        );
      },
      onCell: (record) => ({
        rowSpan: record.rowSpan
      }),
      sorter: (a, b) => {
        return a.name.localeCompare(b.name);
      },
    },
    {
      title: '策略名称',
      dataIndex: 'strategy_name',
      width:100,
      align:'center',
    },
    {
      title: t('告警级别'),
      dataIndex: 'name',
      render: (data, record) => {
        return (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: 2,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 4,
              }}
            >
              {_.map(record.severities, (severity) => {
                return (
                  <Tag
                    key={severity}
                    color={priorityColor[severity - 1]}
                    style={{
                      marginRight: 0,
                    }}
                  >
                    {/* S{severity} */}
                    {severity == 1 ? '紧急告警' : severity == 2 ? '重要告警' : severity == 3 ? '一般告警' : null}
                  </Tag>
                );
              })}
            </div>
            <div>
              {_.map(record.append_tags, (item) => {
                return (
                  <Tooltip key={item} title={item}>
                    <Tag color='purple' style={{ maxWidth: '100%' }}>
                      <div
                        style={{
                          maxWidth: 'max-content',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item}
                      </div>
                    </Tag>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        );
      },
    },
    {
      title: '告警接收组',
      dataIndex: 'notify_groups_obj',
      align: 'center',
      width: 120,
      render: (data) => {
        return (
          <Tags
            width={110}
            data={_.map(data, (user) => {
              return user.nickname || user.username || user.name;
            })}
          />
        );
      },
    },
    {
      title: '资产类型',
      width: 150,
      dataIndex: 'asset_type',
      align: 'center',
    },
    {
      title: '更新时间',
      dataIndex: 'update_at',
      width: 150,
      align: 'center',
      render: (text: string) => {
        return <div className='table-text'>{moment.unix(Number(text)).format('YYYY-MM-DD HH:mm:ss')}</div>;
      },
      sorter: (a, b) => {
        return a.update_at > b.update_at ? 1 : -1;
      },
    },
    {
      title: '更新人',
      width: 80,
      dataIndex: 'update_by',
      align: 'center',
    },
    {
      title: '操作',
      align: 'center',
      width: 120,
      fixed: 'right',
      render: (val, record: any) => {
        return (
          <Space>
            {(profile.roles?.includes("Admin") ||
              permList.includes("/alert-rules/status")) && (
              <PoweroffOutlined
                title={
                  record["disabled"] === AlertRuleStatus.Enable
                    ? "已启动"
                    : "未启动"
                }
                style={{
                  color:
                    record["disabled"] === AlertRuleStatus.Enable
                      ? "green"
                      : "red",
                }}
                onClick={(e) => {
                  // const { id, disabled } = record;
                  const { strategy_id, disabled } = record;

                  Modal.confirm({
                    title: `确认要修改状态为：${
                      record["disabled"] === AlertRuleStatus.Enable
                        ? "关闭"
                        : "启动"
                    }`,
                    // onOk: () => {
                    //   bgid &&
                    //     updateAlertRules(
                    //       {
                    //         ids: [id],
                    //         fields: {
                    //           disabled: !disabled ? 1 : 0,
                    //         },
                    //       },
                    //       bgid
                    //     ).then(() => {
                    //       getAlertRules(params);
                    //     });
                    // },
                    onOk: () => {
                      bgid &&
                        updateAlertRulesStatus(
                          {
                            strategyids: [strategy_id],
                            fields: {
                              disabled: !disabled ? 1 : 0,
                            },
                          },
                          bgid
                        ).then(() => {
                          getAlertRules(params);
                        });
                    },
                    onCancel() {},
                  });
                }}
                rev={undefined}
              />
            )}
            {(profile.roles?.includes("Admin") ||
              permList.includes("/alert-rules/copy")) && (
              <Link
                title="克隆"
                className="table-operator-area-normal"
                  // to={{
                  //   pathname: `/alert-rules/edit/${record.id}?mode=clone`,
                  // }}
                to={{
                  pathname: `/alert-rules/edit/${record.strategy_id}?mode=clone`,
                }}
                target="_self"
              >
                <CopyTwoTone rev={undefined} />
              </Link>
            )}
            {(profile.roles?.includes("Admin") ||
              permList.includes("/alert-rules/detail")) && (
              <FileSearchOutlined
                title="查看"
                  // onClick={() => {
                  //   history.push(`alert-rules/edit/${record.id}?mode=view`);
                  // }}
                onClick={() => {
                  history.push(
                    `alert-rules/edit/${record.strategy_id}?mode=view`
                  );
                }}
                rev={undefined}
              />
            )}
            {(profile.roles?.includes("Admin") ||
              permList.includes("/alert-rules/put")) && (
              <EditOutlined
                title="编辑"
                  // onClick={() => {
                  //   history.push(`alert-rules/edit/${record.id}`);
                  // }}
                onClick={() => {
                  history.push(`alert-rules/edit/${record.strategy_id}`);
                }}
                rev={undefined}
              />
            )}
            {(profile.roles?.includes("Admin") ||
              permList.includes("/alert-rules/del")) && (
              <div
                title="删除"
                className="table-operator-area-warning"
                onClick={() => {
                  Modal.confirm({
                    title: "确认要删除",
                    okText: "确认",
                    cancelText: "取消",
                    // onOk: () => {
                    //   // 删除策略
                    //   bgid &&
                    //     deleteStrategy([record.id], bgid).then(() => {
                    //       message.success('删除成功');
                    //       getAlertRules(params);
                    //       setSelectRowKeys([]);
                    //     });
                    // },
                    onOk: () => {
                      // 删除告警规则
                      bgid &&
                        deleteAlertRules(record.strategy_id, bgid).then(
                          () => {
                            message.success("删除成功");
                            getAlertRules(params);
                            setSelectRowKeys([]);
                          }
                        );
                    },
                    onCancel() {},
                  });
                }}
              >
                <DeleteOutlined rev={undefined} />
              </div>
            )}
            {record.prod === "anomaly" && (
              <div>
                <Link to={{ pathname: `/alert-rules/brain/${record.id}` }}>
                  {t("brain_result_btn")}
                </Link>
              </div>
            )}
          </Space>
        );
      },
      onCell: (record) => ({
        rowSpan: record.rowSpan
      }),
    },
  ];

  const { components, resizableColumns, tableWidth } = useAntdResizableHeader({
    columns: useMemo(() => selectColumns, []),
    columnsState: {
      persistenceType: 'localStorage',
      persistenceKey: `dashboard-table-resizable-xh-rule-management`,
    },
  });

  // 合并相同的告警规则名称单元格、操作列、选择列 合并单元格
  const processData = (data) => {
    // 1. 按 strategy_id 分组
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.strategy_id]) {
        acc[item.strategy_id] = [];
      }
      acc[item.strategy_id].push(item);
      return acc;
    }, {});
  
    // 生成 strategy_id 到 ids 的映射
    const strategyIdToIds = {};
    Object.values(grouped).forEach(group => {
      if (group.length > 0) {
        strategyIdToIds[group[0].strategy_id] = group.map(item => item.id);
      }
    });

    // 2. 为每个组的第一项设置 rowSpan
    const processedData = [];
    Object.values(grouped).forEach(group => {
      group.forEach((item, index) => {
        processedData.push({
          ...item,
          rowSpan: index === 0 ? group.length : 0
        });
      });
    });
    return { processedData, strategyIdToIds };
  };
  
  // 新增 state 保存 strategyIdToIds
  const [strategyIdToIds, setStrategyIdToIds] = useState({});

  // rowSelection 相关逻辑单独提取
  const rowSelection = {
    selectedRowKeys: selectRowKeys,
    renderCell: (checked, record, index, originNode) => {
      if (record.rowSpan === 0) return { children: null, props: { rowSpan: 0 } };
      return { children: originNode, props: { rowSpan: record.rowSpan } };
    },
    onSelect: (record, selected) => {
      const groupIds = strategyIdToIds[record.strategy_id];
      let newSelectedRowKeys = [...selectRowKeys];
      if (selected) {
        newSelectedRowKeys = Array.from(new Set([...newSelectedRowKeys, ...groupIds]));
      } else {
        newSelectedRowKeys = newSelectedRowKeys.filter(id => !groupIds.includes(id));
      }
      setSelectRowKeys(newSelectedRowKeys);
      const newSelectedRows = listTableData.filter(item => newSelectedRowKeys.includes(item.id));
      setSelectedRows(newSelectedRows);
    },
    onSelectAll: (selected) => {
      let newSelectedRowKeys;
      if (selected) {
        newSelectedRowKeys = listTableData.map(item => item.id);
      } else {
        newSelectedRowKeys = [];
      }
      setSelectRowKeys(newSelectedRowKeys);
      const newSelectedRows = listTableData.filter(item => newSelectedRowKeys.includes(item.id));
      setSelectedRows(newSelectedRows);
    }
  };
  useEffect(() => {
    const validIds = listTableData.map(item => item.id);
    const filteredSelectRowKeys = selectRowKeys.filter(id => validIds.includes(id));
    if (filteredSelectRowKeys.length !== selectRowKeys.length) {
      setSelectRowKeys(filteredSelectRowKeys);
    }
    const newSelectedRows = listTableData.filter(item => filteredSelectRowKeys.includes(item.id));
    setSelectedRows(newSelectedRows);
  }, [listTableData, selectRowKeys]);

  const getAlertRules = async (params) => {
    if (!bgid) {
      return;
    }
    params["id"] = bgid;
    await getStrategyGroupSubList(params).then(({ dat }) => {
      setLoading(false);
      setTotal(dat.total)
      let lists = dat.list;
      // setListTableData(lists);
      console.log("是否-数据----", lists);
      const { processedData, strategyIdToIds } = processData(lists);
      setListTableData(processedData);
      setStrategyIdToIds(strategyIdToIds);
    })
  };
  useEffect(() => {
    getAssetstypes().then((res) => {
      filterOptions['type'] = res.dat.map((v) => {
        return {
          value: v.name,
          label: v.name,
        };
      });
      setFilterOptions({ ...filterOptions });
      const items = res.dat.map((v) => {
        return {
          value: v.name,
          label: v.name,
          ...v,
        };
      });
      typeOptions.push({
        label: '资产类型',
        options: items,
      });
      setTypeOptions(_.cloneDeep(typeOptions));
    });
    filterOptions['severity'] = [
      // { label: 'S1', value: '1' },
      // { label: 'S2', value: '2' },
      // { label: 'S3', value: '3' },
      { label: '紧急告警', value: '1' },
      { label: '重要告警', value: '2' },
      { label: '一般告警', value: '3' },
    ];
    setFilterOptions({ ...filterOptions });
  }, []);
  useEffect(() => {
    loadingData(current, pageSize);
  }, [bgid, searchVal, refreshLeft]);

  const loadingData = (current, pageSize) => {
    params['page'] = current;
    params['limit'] = pageSize;
    if (bgid) {
      params['id'] = bgid;
      if (assetid != null && assetid > 0) {
        params['filter'] = 'asset_id';
        params['query'] = '' + assetid;
      } else if (searchVal != null && searchVal.length > 0) {
        params['query'] = searchVal;
        params['filter'] = filterParam;
      } else {
        delete params['filter'];
        delete params['query'];
      }
      getAlertRules(params);
    }
  };

  if (!bgid) return null;

  const onPageChange = (page: number, pageSize: number) => {
    setCurrent(page);
    setPageSize(pageSize);
    loadingData(page, pageSize);
  };

  return (
    <div className='alert-rules-list-container'>

      <Row justify='space-between'>
        <Col span={20}>
          <Space>
            <RefreshIcon
              onClick={() => {
                getAlertRules(params);
              }}
            />
            <Select
              placeholder='选择过滤器'
              style={{ width: 120 }}
              value={filterParam}
              onChange={(value) => {
                queryFilter.forEach((item) => {
                  if (item.name == value) {
                    setFilterType(item.type);
                  }
                });
                setFilterParam(value);
                setSearchVal(null)
                setCurrent(1);
              }}>
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
                  setCurrent(1);
                  setSearchVal(e.target.value)
                }}
                suffix={<SearchOutlined rev={undefined} />}
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
                  setCurrent(1);
                  setSearchVal(val)
                }}
                placeholder={'选择要查询的条件'}
              />
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            {
              (profile.roles?.includes("Admin") || permList.includes("/alert-rules/add")) && <Button
                type='primary'
                onClick={() => {
                  window.localStorage.removeItem('select_monitor_asset_ip');
                  let path_params = assetid != null && assetid > 0 ? '?action=add&assetid=' + assetid : '';
                  history.push({
                    pathname: `/alert-rules/add/${bgid > 0 ? bgid : 1}${path_params}`,
                    state: {
                      asset_id: assetid,
                    },
                  });
                }}
                className='strategy-table-search-right-create'
              >
                添加
              </Button>
            }
            {
              (profile.roles?.includes("Admin") || permList.includes("/alert-rules/ops")) && <MoreOperations
                bgid={bgid}
                selectRowKeys={selectRowKeys}
                selectedRows={selectedRows}
                refreshRules={(e) => {
                  setCurrent(1);
                  setRefreshLeft(_.uniqueId('refresh_left'));
                }}
              />
            }
          </Space>
        </Col>
      </Row>
      <div className='renderer-table-container' >
        <div className='renderer-table-container-box' >
          <Table
            size='small'
            rowKey='id'
            pagination={{
              showSizeChanger: true,
              showQuickJumper: true,
              total: total,
              current: current,
              pageSize: pageSize,
              onChange: onPageChange,
              showTotal: (total) => `总共 ${total} 条`,
              pageSizeOptions: [10, 20, 50, 100],
            }}
            loading={loading}
            bordered
            dataSource={listTableData}
            className='ruler-table_columns'
            // rowSelection={{
            //   selectedRowKeys: selectedRows.map((item) => item.id),
            //   onChange: (selectedRowKeys: React.Key[], selectedRows: any[]) => {
            //     setSelectRowKeys(selectedRowKeys);
            //     setSelectedRows(selectedRows);
            //   },
            // }}
            rowSelection={rowSelection}
            scroll={{ x: tableWidth }}
            components={components}
            columns={resizableColumns}
          />
        </div>
      </div>
    </div>
  );
}
