// page list 接口管理
// date : 2023-10-21 09:09
// desc : 接口管理

import { Button, Input, message, Modal, Space, Table } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';

import PageLayout from '@/components/pageLayout';
import RefreshIcon from '@/components/RefreshIcon';
import { listApiService, deleteApiService } from '@/services/api_service';
import Add from './Add';
import Edit from './Edit';
import Detail from './Detail';

import './index.less';

export type ApiServiceType = {
  id?: number;
  name: string;
  type: string;
  datasource_id: number;
  url: string;
  script: string;
};

const ApiService = () => {
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [searchVal, setSearchVal] = useState('');
  const history = useHistory();

  useEffect(() => {
    listApiService().then((res) => {
      setItems(res.dat.list);
    });
  }, [searchVal, refreshKey]);

  return (
    <>
      <PageLayout title={'接口管理'}>
        <div className='table-content'>
          <div className='table-header'>
            <Space>
              <RefreshIcon
                onClick={() => {
                  setRefreshKey(_.uniqueId('refreshKey_'));
                }}
              />
              {/* <div className='table-header-search'>
                <Input className={'searchInput'} value={searchVal} onChange={(e) => setSearchVal(e.target.value)} prefix={<SearchOutlined />} placeholder={'搜索'} />
              </div> */}
            </Space>
            <Space>
              <div>
                <Button
                  type='primary'
                  onClick={() => {
                    history.push(`api-service/add`);
                  }}
                >
                  新建
                </Button>
              </div>
            </Space>
          </div>
          <Table
            dataSource={items}
            rowKey='id'
            columns={[
              { title: '名称', dataIndex: 'name' },
              { title: '类型', dataIndex: 'type' },
              { title: '数据源', dataIndex: 'datasource_id' },
              { title: 'URL', dataIndex: 'url' },
              {
                title: '创建时间',
                dataIndex: 'created_at',
                render: (value) => {
                  return new Date(value * 1000).toLocaleString();
                },
              },
              {
                title: '操作',
                width: '120px',
                align: 'center',
                fixed: 'right',
                render: (value: string, record: any) => (
                  <Space>
                    <SearchOutlined
                      onClick={() => {
                        history.push(`api-service/${record.id}`);
                      }}
                    ></SearchOutlined>
                    <EditOutlined
                      onClick={() => {
                        history.push(`api-service/${record.id}/edit`);
                      }}
                    />
                    <DeleteOutlined
                      onClick={() => {
                        Modal.confirm({
                          title: '是否确认删除?',
                          onOk: () => {
                            deleteApiService(record.id).then(() => {
                              message.success('删除成功');
                              setRefreshKey(_.uniqueId());
                            });
                          },
                          onCancel() {},
                        });
                      }}
                    />
                  </Space>
                ),
              },
            ]}
          ></Table>
        </div>
      </PageLayout>
    </>
  );
};

export default ApiService;
export { Add, Edit, Detail };
