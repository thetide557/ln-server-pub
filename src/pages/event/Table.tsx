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
import React, { useState, useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tag, Button, Table, Tooltip, Space, Modal, message } from 'antd';
import { useHistory, Link } from 'react-router-dom';
import moment from 'moment';
import _ from 'lodash';
import queryString from 'query-string';
import { useAntdTable } from 'ahooks';
import { CommonStateContext } from '@/App';
import { getEvents } from './services';
import { deleteAlertEventsModal } from './index';
import { SeverityColor,SeverityFont } from './index';
import { getStrategiesByRuleIds } from '@/services/warning';
import '../event/index.less';
// @ts-ignore
import AckBtn from 'plus:/parcels/Event/Acknowledge/AckBtn';
import { FileSearchOutlined, DownloadOutlined, DeleteOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { center } from '@antv/x6/lib/registry/node-anchor/bbox';
import { useLocalStorage } from 'react-use';

interface IProps {
  filterObj: any;
  header: React.ReactNode;
  filter: any;
  setFilter: (filter: any) => void;
  deleteAlert:(id: any) => void;
  refreshFlag: string;
  selectedRowKeys: number[];
  setSelectedRowKeys: (selectedRowKeys: number[]) => void;
}

export default function TableCpt(props: IProps) {
  const { filterObj, filter, setFilter, header, selectedRowKeys, setSelectedRowKeys,deleteAlert } = props;
  const history = useHistory();
  const { t } = useTranslation('AlertCurEvents');
  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_'));
  const [pageSize, setPageSize] = useLocalStorage('events_current_page', 10);



  const columns:any = [
    
    {
      title: '告警规则名称',
      dataIndex: 'rule_name',
      width: 150,
      render(title, { id, tags }) {
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          history.push(`/alert-cur-events/${id}`)
        }}>{title}</div>;
      },
      sorter: (a, b) =>{
        return (a.rule_name).localeCompare(b.rule_name)
      },
    },
    {
      title: '资产名称',
      dataIndex: 'asset_name',
      width: 100,
      align: "center",  
      ellipsis: true,    
      render(name, record, index) {
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          history.push(`/xh/monitor/add?type=monitor&id=${record.asset_id}&asset_id=${record.asset_id}&action=asset&prom=1`)
        }}>{name}</div>;
      },
      sorter: (a, b) =>{
        return (a.asset_name).localeCompare(b.asset_name)
      },
    },
    {
      title: 'IP地址',
      dataIndex: 'asset_ip',
      width: 100,
      align: "center",
      render(name, record, index) {
        return <div style={{ color: '#2B7EE5', cursor: 'pointer' }} onClick={(e) => {
          history.push(`/xh/monitor/add?type=monitor&id=${record.asset_id}&asset_id=${record.asset_id}&action=asset&prom=1`)
        }}>{name}</div>;
      },
      sorter: (a, b) =>{
        return (a.asset_ip).localeCompare(b.asset_ip)
      },
    },
    // {
    //   title: '告警规则',
    //   dataIndex: 'rule_config_cn',
    //   align: "center",
    //   width: 180,
    //   render: (value,record) => {
    //     return  value;
    //   },
    //   sorter: (a, b) =>{
    //     return (a.rule_config_cn).localeCompare(b.rule_config_cn)
    //   },
    // }, 
    {
      title: '告警级别',
      dataIndex: 'severity',
      align: "center",
      width: 60,
      render(val,record) {
        return (
          <>
          <Tag  color={SeverityColor[val-1]}>
             {SeverityFont[val-1]} 
            </Tag>
          </>
        );
      },
      sorter: (a, b) =>{
        return (a.severity)-(b.severity)
      },
    },
    {
      title: t('trigger_time'),
      dataIndex: 'trigger_time',
      align: "center",
      width: 120,
      sorter: (a, b) =>{
        return a.trigger_time > b.trigger_time ? 1 : -1
      },
      render(value) {
        return moment(value * 1000).format('YYYY-MM-DD HH:mm:ss');
      },
    },
    {
      title: '业务组',
      dataIndex: 'group_name',
      align: "center",
      width: 120,
      sorter: (a, b) =>{
        return (a.group_name).localeCompare(b.group_name)
      },
      render(value) {
        return value;
      },
    },
    {
      title: t('common:table.operations'),
      dataIndex: 'operate',
      width: 80,
      align: 'center',
      fixed:'right',
      render(value, record) {
        return (
          <div>
            <Space size={'small'} className='table-operate-column'>
              <FileSearchOutlined title='详情' onClick={()=>{
                  history.push({
                    pathname: `/alert-cur-events/${record.id}`
                  });
              }}/>
            <EyeInvisibleOutlined  title='屏蔽'
              onClick={() => {
                history.push({
                  pathname: '/alert-mutes/add',
                  search: queryString.stringify({
                    busiGroup: record.group_id,
                    prod: record.rule_prod,
                    cate: record.cate,
                    from: "list",
                    datasource_ids: [record.datasource_id],
                    tags: record.tags,
                  }),
                });
              }}
            />
            <DownloadOutlined className='down_icon' title='导出'
              onClick={() => {
                deleteAlert(record.id);
              }}
            />
            <DeleteOutlined  title='删除' onClick={() => {
              deleteAlertEventsModal(
                [record.id],
                () => {
                  setSelectedRowKeys(selectedRowKeys.filter((key) => key !== record.id));
                  setRefreshFlag(_.uniqueId('refresh_'));
                },
                t,
              )
            }} />

          </Space>
          </div>
        );
      },
    },
  ];
  if (import.meta.env.VITE_IS_PRO === 'true') {
    columns.splice(4, 0, {
      title: t('status'),
      dataIndex: 'status',
      width: 100,
      render: (value) => {
        return t(`status_${value}`) as string;
      },
    });
  }
  const fetchData = () => {
    filterObj["alert_type"] =1;
    let current =localStorage.getItem('events_current_from')?parseInt(""+localStorage.getItem('events_current_from')):1;
    return getEvents({
      page: current,
      limit: pageSize,
      ...filterObj,
    }).then(async (res) => {

      let list = res.dat.list;
      if(list!=null){
        let ruleIds  =Array.from(new Set(list.map(obj => obj.rule_id)))
        await getStrategiesByRuleIds(ruleIds).then((res)=>{
           let rules = {};
           res.dat.forEach(rule => {
              return rules[rule.id]=rule;
           });
           list.forEach(item => {
                if(rules[item.rule_id]){
                  item["rule_config_cn"] = rules[item.rule_id].rule_config_cn;
                  
                }else{
                  item["rule_config_cn"] = "";
                }
                return item
           });
        })
      }
      return {
        total: res.dat.total,
        list: list,
      };
    });
  };

  const { tableProps } = useAntdTable(fetchData, {
    refreshDeps: [refreshFlag, JSON.stringify(filterObj), props.refreshFlag],
    defaultPageSize: pageSize,    
    debounceWait: 500,
  });

  const onPageChange = (page: number, pageSize: number) => {
    // setCurrent(page);
    localStorage.setItem('events_current_from',""+page)
    setPageSize(pageSize);
  };


  return (
    <div className='event-content'>
      <div style={{ padding: 16, width: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex' }}>{header}</div>
        <Table
          size='small'
          tableLayout='fixed'
          rowKey={(record) => record.id}
          columns={columns}
          bordered
          className='current_events_list'
          {...tableProps}
          rowSelection={{
            selectedRowKeys: selectedRowKeys,
            onChange(selectedRowKeys: number[]) {
              setSelectedRowKeys(selectedRowKeys);
            },
          }}
          pagination={{
            ...tableProps.pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            current: localStorage.getItem('events_current_from')?parseInt(""+localStorage.getItem('events_current_from')):1,
            pageSize: pageSize,
            onChange: onPageChange,
            showTotal: (total) => `总共 ${total} 条`,
            pageSizeOptions: ['30', '100', '200', '500'],
          }}
        />
      </div>
    </div>
  );
}
