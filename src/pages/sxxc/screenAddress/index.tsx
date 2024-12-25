import { Button, Input, message, Modal, Space, Table } from 'antd';
import _ from 'lodash';
import React, { useEffect, useState, useContext } from 'react';
import { DeleteOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { useHistory } from 'react-router-dom';
import { CommonStateContext } from '@/App';
import PageLayout from '@/components/pageLayout';
import RefreshIcon from '@/components/RefreshIcon';
import { deleteScreenById, getBigScreen } from '@/services/sxxc/bigScreen';
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
    // console.log(location);
    getBigScreen().then(res => {
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
              { title: '标题', dataIndex: 'title' },
              // { title: '大屏名称', dataIndex: 'screenName' },
              { title: '配置', dataIndex: 'config' },
              { title: '简介', dataIndex: 'desc' },
              { title: '创建人', dataIndex: 'created_by' },
              // { title: '数据源', dataIndex: 'datasource_id' },
              // { title: 'URL', dataIndex: 'url' },
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
                    {
                      (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/detail")) && <SearchOutlined
                        onClick={() => {
                          history.push(`address/${record.id}`);
                        }}
                      ></SearchOutlined>
                    }
                    {
                      (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/put")) && <EditOutlined
                        onClick={() => {
                          history.push(`address/${record.id}/edit`);
                        }}
                      />
                    }
                    {
                      (profile.roles?.includes("Admin") || permList.includes("/bigscreen/address/del")) && <DeleteOutlined
                        onClick={() => {
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
                        }}
                      />
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
