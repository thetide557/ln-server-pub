// @ts-nocheck
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Tabs, Select, Form, Row, Col, DatePickerProps, TreeSelect, Checkbox, Popover } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CaretDownOutlined, DownOutlined, DownloadOutlined, EditOutlined, GroupOutlined, OneToOneOutlined, SearchOutlined, TableOutlined, UnorderedListOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import './style.less';
import _, { set } from 'lodash';
// import Add from './Add';
import { Link, useHistory } from 'react-router-dom';
import { useAntdTable, useToggle } from 'ahooks';
import { getScrapList, addScrap } from '@/services/assets/device-scrap';
import DatePicker, { RangePickerProps } from 'antd/es/date-picker';
const { RangePicker } = DatePicker;
import { getSysLogList, getSysLogListBasedOnSearch } from '@/services/syslog';
import { exportTempletZip } from '../../historyEvents/services';
import { getAssetstypes } from '@/services/assets';
import { DataNode } from 'antd/es/tree';
import Accordion from '@/pages/xh/assetmgt/Accordion';
import { Resizable } from 're-resizable';
import { useLocalStorage } from 'react-use';

export default function () {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const { profile, permList } = useContext(CommonStateContext);
  const [refreshFlag, setRefreshFlag] = useState<string>("");
  const [query, setQuery] = useState({})
  const [filterType, setFilterType] = useState<string>("");
  const [filterParam, setFilterParam] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [searchVal, setSearchVal] = useState<any>('');
  const [selectRowKeys, setSelectRowKeys] = useState<any[]>([]);
  const [treeData, setTreeData] = React.useState<DataNode[]>();
  const [expandedKeys, setExpandedKeys] = useState<any[]>();
  const [assetTypes, setAssetTypes] = useState<any[]>([]);
  const [collapse, setCollapse] = useState(localStorage.getItem('left_log_list') === '1');
  const [width, setWidth] = useState(_.toNumber(localStorage.getItem('leftassetWidth') || 200));
  const [modifySelectLog, setModifySelectLog] = useState<boolean>(true);
  const [selectLog, setSelectLog] = useLocalStorage<any>('left_logs_type', '0');
  const [current, setCurrent] = useLocalStorage("log_current", 1);
  // const [pageSize, setPageSize] = useLocalStorage("log_current_page",10);
  // 列处理
  const [groupedColumns, setGroupedColumns] = useState<any>({});

  const [filter, setFilter] = useState<any | {
    group?: number;
    severity?: number;
    query: string;
    start: number;
    end: number;
    type: any | number;
  }>({
    query: '',
    filter: '',
    type: null,
    start: 0,
    end: 0,
  });
  const tableColumns = [
    {
      title: '文件名称',
      dataIndex: 'name',
      sorter: (a, b) => {
        return a.name.localeCompare(b.name);
      },
    },
    {
      title: '修改时间',
      dataIndex: 'update_time',
      render: (val, record: any) => {
        const date = moment.unix(val);
        const formattedTime = date.format('YYYY-MM-DD HH:mm:ss'); // 使用 format 方法将时间格式化为 24 小时制的时间
        return formattedTime;
      },
      sorter: (a, b) => {
        return a.update_time - b.update_time;
      },
    },
    {
      title: '文件大小',
      dataIndex: 'size',
    },

    {
      title: '操作',
      width: '180px',
      align: 'center',
      render: (val, record: any) => {
        return (
          (profile.roles?.includes("Admin") || permList.includes("/log/syslog/export")) && <Button onClick={() => {
            let ids = new Array();
            ids.push(record.name);
            handleModal("open", ids, record.log_type);
          }}>
            导出
          </Button>

        );
      }
    },
  ];
  let queryFilter = [
    { name: 'file_name', label: '文件名称', type: 'input' },
  ]

  const [selectColum, setSelectColum] = useState<any>(tableColumns)
  //时间选择框使用
  const onTimeChange = (
    value: DatePickerProps['value'] | RangePickerProps['value'],
    dateString: [string, string] | string,
  ) => {
    //console.log('Selected Time: ', value);
    if (value == null) {
      filter["start"] = 0;
      filter["end"] = 0;
      setFilter({ ...filter });
      setRefreshFlag(_.uniqueId('refresh_'));
    }
    //console.log('Formatted Selected Time: ', dateString);
  };
  //时间选择框使用
  const onOk = (value: DatePickerProps['value'] | RangePickerProps['value'] | any) => {
    //console.log('onOk: ', value);
    value?.forEach((element, index) => {
      if (index == 0 && element != null) {
        filter["start"] = moment(element).unix()
        setFilter({ ...filter });
      }
      if (index == 1 && element != null) {
        filter["end"] = moment(element).unix()
        setFilter({ ...filter });
      }
    });
    setRefreshFlag(_.uniqueId('refresh_'));
  };
  const handleModal = (action: string, rowKeys: any[] | null, selectLog) => {
    if (action == "open") {
      let url = "/api/n9e/xh/sys-log/export-xls";
      let exportTitle = "系统";
      let params = {}
      if (selectLog != null && selectLog != '0') {
        params['list'] = selectLog;
      }
      exportTempletZip(url, params, (rowKeys != null && rowKeys.length > 0) ? { names: rowKeys } : null).then((res) => {
        let blob = new Blob([res], {
          // 下载的文件类型(此处可更改：具体取值参考以下链接地址)
          type: 'application/zip',
        });
        let url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        let fileType = ".zip"
        const fileName = exportTitle + "日志_" + moment().format('MMDDHHmmss') + fileType //decodeURI(res.headers['filename']);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
      })

    }
  }

  const getTableData = ({ current, pageSize }): Promise<any> => {
    // debugger
    const params = {
      page: current,
      limit: pageSize,
    };
    if (filterName != null && filterName.length > 0) {
      params["filter"] = filterName;
      //console.log("FFFFFFFFFF",filterName)
    }
    if (searchVal != null && searchVal.length > 0) {
      console.log("searchVal", searchVal)
      params["query"] = searchVal;
    }
    if (filter != undefined && filter != null && filter["end"] != 0) {
      //console.log("filter",filter)
      params["start"] = filter["start"];
      params["end"] = filter["end"];
    }
    if (selectLog != null && selectLog != '0' && modifySelectLog) {
      params['list'] = selectLog;
    }
    return getSysLogListBasedOnSearch({
      ...params
    }).then((res) => {
      return {
        total: res.dat.total,
        list: res.dat.list.map((v, index) => {
          v["log_type"] = selectLog;
          return v
        }),
      };
    });
  };


  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    refreshDeps: [query, refreshFlag],
  });
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
  }

  useEffect(() => {
    //获取左边日志目录
    getSysLogList().then((res) => {
      let arr = ['0'];
      const items = res.dat.map((v) => {
        return {
          id: v,
          name: v,
          ...v,
        };
      });
      //console.log("items",items);
      let treeData: any[] = [
        {
          id: '0',
          name: '全部日志',
          count: 0,
          children: items,
        },
      ];
      items.map((item, index) => {
        arr.push(item.id);
      });
      setExpandedKeys(arr);
      setAssetTypes(items);
      loadingGroupColumns(items)
      setTreeData(_.cloneDeep(treeData));
    });
    setRefreshFlag(_.uniqueId('refresh_flag'))

  }, [searchVal, selectLog]);



  return (
    <PageLayout icon={<GroupOutlined />} title={'系统日志'} >
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
                localStorage.setItem('left_log_list', !collapse ? '1' : '0');
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
                selectedKey={selectLog}
                expandedKeys={expandedKeys}
                handleClick={async (key: any, node: any, type) => {
                  if (type == 'query' && modifySelectLog) {
                    //选中日志的操作
                    setSelectLog(key);
                    setCurrent(1);
                    setRefreshFlag(_.uniqueId('refresh_flag'))
                  }
                }}
              />



            </div>
          </div>
        </Resizable>
        <div className='table-content'>


          <div className='table-header'>
            <Form layout="inline" labelAlign="left" className='query_form'>
              <Row className='row-spe'>
                <Col >
                  <Select
                    // defaultValue="lucy"
                    placeholder="选择过滤器"
                    style={{ width: 120 }}
                    allowClear
                    onChange={(value) => {
                      queryFilter.forEach((item) => {
                        if (item.name == value) {
                          setFilterType(item.type);
                          setFilterName(item.name);
                        }
                      })
                      setFilterParam(value);
                      setSearchVal("")
                    }}>
                    {queryFilter.map((item, index) => (
                      <option value={item.name} key={index}>{item.label}</option>
                    ))
                    }
                  </Select>
                </Col>

                <Col >
                  {filterType == "input" && (
                    <Input
                      className={'searchInput'}
                      value={searchVal}
                      allowClear
                      onChange={(e) => setSearchVal(e.target.value)}
                      suffix={<SearchOutlined />}
                      placeholder={'输入模糊检索关键字'}
                    />
                  )}
                  {filterType == "select" && (
                    <Select
                      className={'searchInput'}
                      value={searchVal}
                      allowClear
                      // options={}
                      onChange={(val) => setSearchVal(val)}
                      placeholder={'选择要查询的条件'}
                    />
                  )}
                </Col>

                <Col>
                  <RangePicker
                    showTime={{ format: 'HH:mm:ss' }}
                    format="YYYY-MM-DD HH:mm"
                    onChange={onTimeChange}
                    onOk={onOk}
                  />
                </Col>

                {
                  (profile.roles?.includes("Admin") || permList.includes("/log/syslog/exportAll")) && <Button className='btn' type="primary" style={{ right: '0', position: 'absolute', marginRight: '16px' }}
                    onClick={() => {
                      if (selectRowKeys.length <= 0) {
                        Modal.confirm({
                          title: "确认导出所有日志信息吗",
                          onOk: async () => {
                            handleModal("open", null, selectLog);
                          },
                          onCancel() { },
                        });
                      } else {
                        handleModal("open", selectRowKeys, selectLog);
                      }
                    }}>批量导出
                  </Button>
                }
              </Row>
            </Form>
          </div>
          <div className='assets-list_1'>

            <Table
              {...tableProps}
              rowKey='name'
              rowSelection={{
                onChange: (_, rows) => {
                  setSelectRowKeys(rows ? rows.map(({ name }) => name) : []);
                  console.log(selectRowKeys);
                },
                selectedRowKeys: selectRowKeys
              }}
              pagination={{
                ...tableProps.pagination,
                size: 'small',
                pageSizeOptions: ['5', '10', '20', '50', '100'],
                showTotal: (total) => `总共 ${total} 条`,
                showSizeChanger: true,
              }}
              onHeaderRow={(columns, index) => {
                return {
                  onClick: () => { }, // 点击表头行
                };
              }}
              columns={selectColum}
              size='small'


            ></Table>

          </div>
        </div>
      </div>
    </PageLayout>
  );
}
