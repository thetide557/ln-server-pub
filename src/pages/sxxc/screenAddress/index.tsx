import { Button, Input, message, Modal, Space, Table } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState, useContext } from 'react';
import { DeleteOutlined, EditOutlined, FileSearchOutlined, SearchOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import PageLayout from '@/components/pageLayout';
import RefreshIcon from '@/components/RefreshIcon';
import { deleteScreenById, getBigScreen2 } from '@/services/sxxc/bigScreen';
import Add from './Add';
import Edit from './Edit';
import Detail from './Detail';
import './index.less';

export type ApiServiceType = {
  id?: number;
  title: string;
  desc: string;
  config: string;
  // datasource_id: number;
  // url: string;
  // script: string;
};

const ApiService = () => {
  const [items, setItems] = useState([]);
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [searchVal, setSearchVal] = useState('');
  const { profile, permList } = useContext(CommonStateContext);
  const history = useHistory();

  useEffect(() => {
    let busiGroup = localStorage.getItem('groupIds') || '';
    getBigScreen2(busiGroup).then(res => {
      setItems(res.dat.list)
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
              {
                (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/add")) && <div>
                  <Button
                    style={{ backgroundColor: '#76D183', border: 'none' }}
                    type='primary'
                    onClick={() => {
                      history.push(`address/add`);
                    }}
                  >
                    新建
                  </Button>
                </div>
              }

            </Space>
          </div>
          <Table
            pagination={false}
            dataSource={items}
            rowKey='id'
            columns={[
              { title: '大屏标题', dataIndex: 'title' },
              {
                title: '大屏类型', dataIndex: 'type', render: (value) => {
                  return value == 1 ? '一级大屏' : value == 2 ? '二级大屏' : '';
                },
              },
              { title: '配置', dataIndex: 'config' },
              { title: '更新人', dataIndex: 'updated_by' },
              {
                title: '更新时间',
                dataIndex: 'updated_at',
                render: (value) => {
                  return new Date(value * 1000).toLocaleString();
                },
              },
              {
                title: '操作',
                width: '220px',
                align: 'center',
                fixed: 'right',
                render: (value: string, record: any) => (
                  <Space>
                    {
                      (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/detail")) &&
                      <div className='items' onClick={(e) => {
                        history.push(`address/${record.id}`);
                      }}>
                        <FileSearchOutlined />
                        <span className='text'>查看</span>
                      </div>
                    }
                    {
                      (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/put")) &&
                      <div className='items' onClick={(e) => {
                        history.push(`address/${record.id}/edit`);
                      }}>
                        <EditOutlined />
                        <span className='text'>编辑</span>
                      </div>
                    }
                    {
                      (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/del")) &&
                      <div className='items' onClick={async () => {
                        Modal.confirm({
                          title: '是否确认删除?',
                          onOk: () => {
                            deleteScreenById(record.id).then(res => {
                              message.success('删除成功');
                              setRefreshKey(_.uniqueId());
                            });
                          },
                          onCancel() { },
                        });
                      }}>
                        <DeleteOutlined />
                        <span className='text'>删除</span>
                      </div>
                    }
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
