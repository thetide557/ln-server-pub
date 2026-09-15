// @ts-nocheck
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch, Tabs, Select, Form, Row, Col, DatePickerProps, TreeSelect, Checkbox, Popover, Radio } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CaretDownOutlined, DownOutlined, DownloadOutlined, EditOutlined, GroupOutlined, OneToOneOutlined, SearchOutlined, TableOutlined, UnorderedListOutlined } from '@ant-design/icons';
import moment from 'moment';
import { CommonStateContext } from '@/App';
import './style.less';
import _, { set } from 'lodash';
// import Add from './Add';
import { getAssetsTree, getAssetsListByFilter, deleteDeviceOnline, getAssetById, exportTemplet } from '@/services/assets/asset'
import { Link, useHistory } from 'react-router-dom';
import { useAntdTable, useToggle } from 'ahooks';
import { getScrapList, addScrap } from '@/services/assets/device-scrap';
import DatePicker, { RangePickerProps } from 'antd/es/date-picker';
import { getLogListBasedOnSearch } from '@/services/operlog';
import { file } from 'jszip';
const { RangePicker } = DatePicker;
export default function () {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const { profile, permList } = useContext(CommonStateContext);
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const [query, setQuery] = useState({})
  const [searchVal, setSearchVal] = useState<any>('');
  const [status, setStatus] = useState<number>();
  const [filterType, setFilterType] = useState<string>("");
  const [filterParam, setFilterParam] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [selectRowKeys, setSelectRowKeys] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [rowKeys, setRowKeys] = useState<any[]>([]);
  const [ftype, setFtype] = useState<number>(1);
  const modelOptions = [
    { label: "资产", value: "资产模块" }, { label: "监控", value: "监控模块" },
    { label: "用户配置", value: "用户配置模块" }, { label: "告警", value: "告警模块" },
    { label: "用户信息", value: "用户信息模块" },
    { label: "接口管理", value: "接口管理模块" }, { label: "登录", value: "登录模块" },
    { label: "许可管理", value: "许可管理模块" }
  ];
  // const statusOptions =[
  //   {label:"类型",value:1},{label:"对象",value:2},
  //   {label:"用户",value:4},{label:"描述",value:3}]; 
  const [filter, setFilter] = useState<any | {
    group?: number;
    severity?: number;
    query: string;
    start: number;
    end: number;
    type: any | number;
  }>({
    query: '',
    type: null,
    start: 0,
    end: -1,
  });
  let queryFilter = [
    { name: 'id', label: '日志编号', type: 'input' },
    { name: 'object', label: '系统模块', type: 'select' },
    { name: 'type', label: '操作类型', type: 'input' },
    { name: 'user', label: '操作人员', type: 'input' },
  ]
  const tableColumns = [
    {
      title: '日志编号',
      align: 'center',
      dataIndex: 'id',
      ellipsis: true,
    },
    {
      title: '操作类型',
      align: 'center',
      dataIndex: 'type',
      ellipsis: true,
    },
    {
      title: '系统模块',
      align: 'center',
      dataIndex: 'object',
      ellipsis: true,
    },
    {
      title: '描述',
      align: 'center',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: '操作人员',
      align: 'center',
      dataIndex: 'user',
      ellipsis: true,
    },
    {
      title: '操作时间',
      align: 'center',
      dataIndex: 'oper_time',
      render: (val, record: any) => {
        const date = moment.unix(val);
        const formattedTime = date.format('YYYY-MM-DD HH:mm:ss'); // 使用 format 方法将时间格式化为 24 小时制的时间
        return formattedTime;
      },
      ellipsis: true,
    },
    {
      title: '操作',
      width: '180px',
      align: 'center',
      render: (val, record: any) => {
        return (
          (profile.roles?.includes("Admin") || permList.includes("/log/operlog/export")) &&
          <a onClick={() => {
            let ids = new Array();
            ids.push(record.id);
            setRowKeys(_.cloneDeep(ids));
            setModalOpen(true);
          }} target='_blank'>
            导出
          </a>
        );
      }
    },
  ];


  const [selectColum, setSelectColum] = useState<any>(tableColumns)
  const getTableData = ({ current, pageSize }): Promise<any> => {
    // debugger
    const params = {
      page: current,
      limit: pageSize,
    };
    if (searchVal != null && searchVal.length > 0) {
      //console.log("searchVal",searchVal)
      params["query"] = searchVal;
      //console.log("query",searchVal)
    }
    //console.log("FFFFFFFFFF",filterName)
    if (filterName != null && filterName.length > 0) {
      params["filterType"] = filterName;
      //console.log("FFFFFFFFFF",filterName)
    }
    // if(status!=undefined&&status>0){
    //   //console.log("status",status)
    //   params["filterType"] = status;
    // }
    if (filter != undefined && filter != null) {
      //console.log("filter",filter)
      params["start"] = filter["start"];
      params["end"] = filter["end"];

    }

    //console.log('getTableData', params);
    return getLogListBasedOnSearch({
      ...params
    }).then((res) => {
      // let modelIds  =Array.from(new Set(res.dat.list.map(obj => obj.device_model)))
      //console.log("AAAAAAAAAAAAAAAAA",res)
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };


  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: 10,
    refreshDeps: [query, refreshFlag],
  });

  useEffect(() => {
    setRefreshFlag(_.uniqueId('refresh_flag'))
  }, [searchVal]);

  const onStatusChange = (e) => {
    let val = e;
    setStatus(val != null ? val : null);
    //console.log("SSSSSSSSSSSS",status)
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };
  //时间选择框使用
  const onTimeChange = (
    value: DatePickerProps['value'] | RangePickerProps['value'],
    dateString: [string, string] | string,
  ) => {
    //console.log('Selected Time: ', value);
    if (value == null) {
      filter["start"] = 0;
      filter["end"] = -1;
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

  const handleModal = (action: string, rowKeys: any[]) => {
    if (action == "open") {
      let params: any = {};
      if (rowKeys != null && rowKeys.length > 0) {
        filter.ids = rowKeys;
      }
      if (searchVal != null && searchVal.length > 0) {
        //console.log("searchVal",searchVal)
        params["query"] = searchVal;
        //console.log("query",searchVal)
      }
      //console.log("FFFFFFFFFF",filterName)
      if (filterName != null && filterName.length > 0) {
        params["filterType"] = filterName;
        //console.log("FFFFFFFFFF",filterName)
      }
      params["ftype"] = ftype;
      let url = "/api/takin/operation-log/export-xls";
      let exportTitle = "操作日志信息";
      exportTemplet(url, filter, params).then((res) => {
        const url = window.URL.createObjectURL(new Blob([res],
          // 设置该文件的mime类型，这里对应的mime类型对应为.xlsx格式                          
          { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        const link = document.createElement('a');
        link.href = url;
        let fileType = ".xls"
        if (ftype === 1) {
          fileType = ".xls"
        } else if (ftype === 2) {
          fileType = ".xml"
        } else if (ftype === 3) {
          fileType = ".txt"
        }
        const fileName = exportTitle + "数据_" + moment().format('MMDDHHmmss') + fileType //decodeURI(res.headers['filename']);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        setModalOpen(false)
      })
    } else {
      setModalOpen(false)
    }
  }

  return (
    <PageLayout icon={<GroupOutlined />} title={'操作日志'} >

      <div className='table-content'>
        <div className='table-header'>

          <Row className='row-spe'>
            <Col>
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
                      // console.log("type",item.type);
                      // console.log("name",item.name);
                      // console.log("value",value);
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
            {/* <Col span={5} >
                      <Input
                          className={'searchInput'}
                          value={searchVal}
                          onChange={(e) => setSearchVal(e.target.value)}
                          suffix={<SearchOutlined />}
                          // onPressEnter={onSearchQuery}
                          placeholder={'请输入类型/用户/对象/描述'}
                        />
                        </Col>  */}
            <Col>
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
                  options={modelOptions}
                  // options={}
                  onChange={(val) => setSearchVal(val)}
                  placeholder={'选择要查询的条件'}
                />
              )}
            </Col>
            <Col >
              <RangePicker
                showTime={{ format: 'HH:mm:ss' }}
                format="YYYY-MM-DD HH:mm"
                onChange={onTimeChange}
                onOk={onOk}
              />
            </Col>

            {/* <Col span={11} >
                    <Select
                      style={{ width: '125px',marginLeft:'10px' }}
                      placeholder="筛选条件"
                      allowClear={true}
                      onChange={onStatusChange}
                      options={statusOptions}
                    />
                    </Col>   */}
            {
              (profile.roles?.includes("Admin") || permList.includes("/log/operlog/exportAll")) && <Button className='btn' type="primary" style={{ right: '0', position: 'absolute', marginRight: '16px' }} onClick={() => {
                if (selectRowKeys.length <= 0) {
                  Modal.confirm({
                    title: "确认导出所有日志信息吗",
                    onOk: async () => {
                      setModalOpen(true);
                    },
                    onCancel() { },
                  });
                } else {
                  setRowKeys(selectRowKeys);
                  setModalOpen(true);
                }
              }}>批量导出
              </Button>
            }


          </Row>
        </div>
        <div className='assets-list_1'>

          <Table
            {...tableProps}
            rowKey='id'
            rowSelection={{
              onChange: (_, rows) => {
                setSelectRowKeys(rows ? rows.map(({ id }) => id) : []);
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
      <Modal title="告警信息导出" visible={modalOpen} onOk={e => { handleModal("open", rowKeys) }} onCancel={e => { handleModal("close", rowKeys) }} >
        <Radio.Group style={{ width: '100%', display: "flex", justifyContent: 'center' }} defaultValue={ftype}>
          <Radio value={1} onChange={e => {
            setFtype(parseInt("" + e.target.value))
          }}>Excle</Radio>
          <Radio value={2} onChange={e => {
            setFtype(parseInt("" + e.target.value))
          }}>XML</Radio>
          <Radio value={3} onChange={e => {
            setFtype(parseInt("" + e.target.value))
          }}>TXT</Radio>
        </Radio.Group>
      </Modal>

    </PageLayout>
  );
}
