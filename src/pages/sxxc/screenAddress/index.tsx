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
import { getListGroupScreen, deleteGroupScreen } from '@/services/sxxc/bigScreen';
import Add from './Add';
import Edit from './Edit';
import Detail from './Detail';

import './index.less';

export type ApiServiceType = {
  id?: number;
  groupName: string;
  screenCode: string;
  // datasource_id: number;
  // url: string;
  // script: string;
};

const ApiService = () => {
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [searchVal, setSearchVal] = useState('');
  const history = useHistory();

  useEffect(() => {
    console.log(location);
    
    // listApiService().then((res) => {
    //   setItems(res.dat.list);
    // });
    getListGroupScreen().then(res => {
      if (res.code == 200) {
        setItems(res.data[1]);
      }
    })
  }, [searchVal, refreshKey]);

  return (
    <>
      <PageLayout title={'大屏配置'}>
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
                    history.push(`address/add`);
                  }}
                >
                  新建
                </Button>
              </div>
            </Space>
          </div>
          <Table
            pagination={false}
            dataSource={items}
            rowKey='id'
            columns={[
              { title: '大屏名称', dataIndex: 'groupName' },
              // { title: '大屏名称', dataIndex: 'screenName' },
              { title: '大屏code', dataIndex: 'screenCode' },
              // { title: '数据源', dataIndex: 'datasource_id' },
              // { title: 'URL', dataIndex: 'url' },
              // {
              //   title: '创建时间',
              //   dataIndex: 'created_at',
              //   render: (value) => {
              //     return new Date(value * 1000).toLocaleString();
              //   },
              // },
              {
                title: '操作',
                width: '120px',
                align: 'center',
                fixed: 'right',
                render: (value: string, record: any) => (
                  <Space>
                    {/* <SearchOutlined
                      onClick={() => {
                        history.push(`address/${record.id}`);
                      }}
                    ></SearchOutlined> */}
                    <EditOutlined
                      onClick={() => {
                        history.push(`address/${record.id}/edit`);
                      }}
                    />
                    <DeleteOutlined
                      onClick={() => {
                        Modal.confirm({
                          title: '是否确认删除?',
                          onOk: () => {
                            deleteGroupScreen(record.id).then(res => {
                              if (res.code == 200) {
                                message.success('删除成功');
                                setRefreshKey(_.uniqueId());
                              }
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
