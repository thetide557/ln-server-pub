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
import moment from 'moment';
import _, { set } from 'lodash';
import { Button, Input, message, Row, Modal, Table, Tree, Dropdown, Menu, Select, Col, Space } from 'antd';
import { DeleteOutlined, DownOutlined, EditOutlined, PlusSquareOutlined, PoweroffOutlined, SearchOutlined, UndoOutlined, UserOutlined } from '@ant-design/icons';
import { ColumnsType } from 'antd/lib/table';
import { useTranslation } from 'react-i18next';
import { useAntdTable } from 'ahooks';
import PageLayout from '@/components/pageLayout';
import UserInfoModal from './component/createModal';
import { getUserInfoList, deleteUser, updateProperty, deleteTeam, getTeamInfoList, deleteUsers, getRoles, getUserList } from '@/services/manage';
import { User, Team, UserType, ActionType, TeamInfo } from '@/store/manageInterface';
import { CommonStateContext } from '@/App';
import usePagination from '@/components/usePagination';
import { OperationModal } from './OperationModal';
import './index.less';
import { OperateType } from './operate_type';
import './locale';
// import { getOrganizationTree,getOrganizationsByIds } from '@/services/assets';


let queryFilter = [
  { name: 'username', label: '用户名', type: 'input' },
  { name: 'nickname', label: '显示名', type: 'input' },
  { name: 'email', label: '邮箱', type: 'input' },
  { name: 'phone', label: '手机号', type: 'input' },
  { name: 'statu', label: '状态', type: 'select' },
  { name: 'role', label: '角色', type: 'select' },
]

const { confirm } = Modal;


const Resource: React.FC = () => {
  const { t } = useTranslation('user');
  const commonState = useContext(CommonStateContext);
  const [visible, setVisible] = useState<boolean>(false);
  const [teamId, setTeamId] = useState(0);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([0]);
  const [action, setAction] = useState<ActionType>();
  // const [userId, setUserId] = useState<string>('');
  const [userId, setUserId] = useState<any>();
  const [query, setQuery] = useState<string>('');
  const [status, setStatus] = useState<number>();
  const [role, setRole] = useState<string>();
  const { profile } = useContext(CommonStateContext);
  const pagination = usePagination({ PAGESIZE_KEY: 'users' });
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [groupMap, setGroupMap] = useState({});
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedRows, setSelectedRows] = useState<any>();
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [roleList, setRoleList] = useState<any[]>([]);
  const [teamInfo, setTeamInfo] = useState<Team>();
  const [actionType, setActionType] = useState<string>("");
  const { Option } = Select;

  const [searchVal, setSearchVal] = useState<any>(null);
  const [filterType, setFilterType] = useState<string>("");
  const [filterParam, setFilterParam] = useState<string>("");
  const [filterName, setFilterName] = useState<string>("");
  const [filterOptions, setFilterOptions] = useState<any>({});
  // const statusOptions =[
  const [filter, setFilter] = useState<{
    datasourceIds: number[];
    bgid?: number;
    severity?: number;
    eventType?: number;
    query: string;
    // rule_prods: string[];
    type: any | number;
  }>({
    datasourceIds: [],
    query: '',
    type: null
  });

  const [treeData, setTreeData] = useState<any[]>([
    { id: 0, name: '全部', parent_id: 0, children: [] },
  ]);
  const statusOptions = [
    { label: "禁用", value: 0 }, { label: "启用", value: 1 }
  ];
  const menu = {
    items: [
      {
        label: '导入',
        key: 'import'
      },
      {
        label: '禁用',
        key: 'stop'
      },
      {
        label: '启用',
        key: 'start'
      },
      {
        label: '删除',
        key: 'delete'
      },
    ]
  };
  const titleRender = (node) => {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <span>{node.name}</span>
      </div>
    );
  };

  const loadingTree = () => {
    getTeamInfoList({ query: '' }).then(({ dat }) => {
      treeData[0].children = dat || [];
      setTreeData(treeData.slice());

      dat.forEach((item, index) => {
        groupMap[item.id] = item.name;  
        setGroupMap({...groupMap})      
      });
      
      let arr = ["0"];
      dat.map((item, index) => {
        arr.push(item.id);
      })
      setExpandedKeys(arr);
    });
  };
  useEffect(() => {
    setRefreshFlag(_.uniqueId('refresh_flag'))
  }, [searchVal]);


  useEffect(() => {
    filterOptions["statu"] = [{ value: '0', label: '禁用' }, { value: '1', label: '启用' }]
    setFilterOptions({ ...filterOptions })
    getRoles().then((res) => {
      let items = res.map(role => {
        return {
          value: "" + role.id,
          label: role.name,
        }
      })
      filterOptions["role"] = items;
      setFilterOptions({ ...filterOptions })
    });
    loadingTree();
  }, []);



  const userColumn: ColumnsType<User> = [
    {
      title: t('account:profile.username'),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: t('account:profile.nickname'),
      dataIndex: 'nickname',
      ellipsis: true,
      render: (text: string, record) => record.nickname || '-',
    },
    {
      title: t('account:profile.email'),
      dataIndex: 'email',
      render: (text: string, record) => record.email || '-',
    },
    {
      title: t('account:profile.phone'),
      dataIndex: 'phone',
      render: (text: string, record) => record.phone || '-',
    },
    {
      title: '所属团队',
      dataIndex: 'group_name',
      render: (val, record) => {
        let names = new Array();
        for(var i=0;i<val.length;i++){
          names.push(groupMap[val[i]]);
        }
        return names ? names.join(",") : ''//renderDataMap["organ_"+val];
      },
    },
    {
      title: t('状态'),
      dataIndex: 'status',
      render: (val, record) => {
        if (val === 0) {
          return "禁用"
        } else if (val === 1) {
          return "启用"
        } else {
          return "N/A"
        }
      }
    },
  ];
  const userColumns: ColumnsType<User> = [
    ...userColumn,
    {
      title: t('account:profile.role'),
      dataIndex: 'roles',
      render: (text: []) => text?.join(', '),
    },
    {
      title: t('common:table.create_at'),
      width: '240px',
      dataIndex: 'create_at',
      render: (text) => {
        return moment.unix(text).format('YYYY-MM-DD HH:mm:ss');
      },
      sorter: (a, b) => a.create_at - b.create_at,
    },
    {
      title: t('common:table.operations'),
      width: '160px',
      align: 'center',
      render: (text: string, record) => (
        <>
          <PoweroffOutlined className='oper-name'
            title={record.status === 1 ? ('已启用') : ('已禁用')}
            style={{ color: record.status === 1 ? ('green') : ('gray') }}
            onClick={e => {
              if ("" + record.id == "1") {
                message.error("默认超管账号，禁止在此操作！");
              } else {
                Modal.confirm({
                  title: "确认要" + (record.status === 1 ? '禁用' : '启用') + "所选用户使用？",
                  onOk: async () => {
                    updateProperty("status", (record.status === 1 ? 0 : 1), [record.id]).then((res) => {
                      message.success('修改成功');
                      setRefreshFlag(_.uniqueId('refreshFlag_'));
                    });
                  },
                  onCancel() { },
                });
              }

            }} />
          <EditOutlined title='编辑' className='oper-name' onClick={() => handleClick(ActionType.EditUser, record.id, "member")}>

          </EditOutlined>
          <UndoOutlined title='重置密码' className='oper-name' onClick={() => handleClick(ActionType.Reset, record.id, "member")}>
            {t('account:password.reset')}
          </UndoOutlined>
          <a className='oper-name'
            onClick={() => {
              if ("" + record.id == "1") {
                message.error("默认超管账号，禁止在此操作！");
                return
              }
              confirm({
                title: t('common:confirm.delete'),
                okText:'确定',
                cancelText: "取消",
                onOk: () => {
                  deleteUser(record.id).then((_) => {
                    message.success(t('common:success.delete'));
                    handleClose(true);
                    setRefreshFlag(_.uniqueId('refreshFlag_'));
                  });
                },
                onCancel: () => { },
              });
            }}
          >
            <DeleteOutlined className='table-operator-area-warning' title='删除' />
          </a>
        </>
      ),
    },
  ];

  if (!profile.roles?.includes('Admin')) {
    userColumns.pop(); //普通用户不展示操作列
  }

  const handleClick = (type: ActionType, id: any, operate: string) => {
    setAction(type);
    setActionType(operate);
    setUserId(id > 0 ? id : undefined)
    setVisible(true);
  };

  const handleOperateClick = (key: string) => {
    console.log("handleOperateClick", key);
    if (key === "import") {
      setOperateType(OperateType.BatchImport as OperateType)
    } else if (key == "add") {
      handleClick(ActionType.CreateUser, "", "member")
    } else {
      // if (selectedRowKeys.length <= 0) {
      //   message.warning("请选择要批量人员信息")
      //   return
      // } else {

      if (key == "changeOrganize") {
        setOperateType(key as OperateType);
      } else if (key == "delete") {
        if (selectedRowKeys.length <= 0) {
          message.warning("请选择要批量删除的用户信息！")
          return
        }
        if (selectedRowKeys.includes(1)) {
          message.error("所选用户中包括超管账号，不可继续操作");
          return
        }
        Modal.confirm({
          title: "确认要批量删除用户信息？",
          onOk: async () => {
            deleteUsers(selectedRowKeys).then((res) => {
              message.success('删除成功');
              setRefreshFlag(_.uniqueId('refreshFlag_'));
              onSelectNone();
            });
          },
          onCancel() { },
        });

      } else if (key == "start") {
        if (selectedRowKeys.length <= 0) {
          message.warning("请选择要批量启用的用户信息！")
          return
        }
        if (selectedRowKeys.includes(1)) {
          message.error("所选用户中包括超管账号，不可继续操作");
          return
        }
        Modal.confirm({
          title: "确认要启用用户使用？",
          onOk: async () => {
            updateProperty("status", 1, selectedRowKeys).then((res) => {
              message.success('修改成功');
              setOperateType(OperateType.None);
              setRefreshFlag(_.uniqueId('refreshFlag_'));
              onSelectNone();
            });
          },
          onCancel() { },
        });

      } else if (key == "stop") {
        if (selectedRowKeys.length <= 0) {
          message.warning("请选择要批量禁用的用户信息！")
          return
        }
        if (selectedRowKeys.includes(1)) {
          message.error("所选用户中包括超管账号，不可继续操作");
          return
        }
        Modal.confirm({
          title: "确认要禁止用户使用？",
          onOk: async () => {
            updateProperty("status", 0, selectedRowKeys).then((res) => {
              message.success('修改成功');
              setOperateType(OperateType.None);
              setRefreshFlag(_.uniqueId('refreshFlag_'));
              onSelectNone();
            });
          },
          onCancel() { },
        });

      }
    }

  };

  // 弹窗关闭回调
  const handleClose = (status) => {
    setVisible(false);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };

  const onSearchQuery = (e) => {
    let val = e.target.value;
    setQuery(val);
  };
  const onStatusChange = (e) => {
    let val = e;
    setStatus(val != null ? val : null);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };
  const onRowChange = (e) => {
    let val = e;
    setRole(val != null ? val : null);
    setRefreshFlag(_.uniqueId('refresh_flag'));
  };


  const onSelectChange = (selectedRowKeys, rows) => {
    console.log("onSelectChange", selectedRowKeys)
    console.log("rows", rows)
    setSelectedRowKeys(selectedRowKeys);
    setSelectedRows(rows)
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const [refreshFlag, setRefreshFlag] = useState<string>(_.uniqueId('refresh_flag'));
  const getTableData = ({ current, pageSize }): Promise<any> => {
    let params = {
      page: current,
      limit: pageSize,
    };
    if (filterName != null && searchVal != null && searchVal.length > 0) {
      params["type"] = filterName;
      params["query"] = searchVal;
      console.log("query", searchVal)
    }
    if (teamId > 0) {
      params["user_group_id"] = teamId;
      console.log("user_group_id", teamId)
    }
    if (role != null) {
      params["role"] = role;
      console.log("role", role)
    }
    if (status != null) {
      params["status"] = status;
      console.log("status", status)
    }

    return getUserInfoList(params).then((res) => {      
      return {
        total: res.dat.total,
        list: res.dat.list,
      };
    });
  };
  const { tableProps } = useAntdTable(getTableData, {
    defaultPageSize: pagination.pageSize,
    refreshDeps: [query, refreshFlag,groupMap],
  });

  const onSelectNone = () => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };


  const handleDeleteUser = (userId) => {
    deleteUser(userId).then(() => {
      // 处理成功或显示消息
      message.success('用户删除成功');
      // 重新加载数据或执行其他操作
      setRefreshFlag(_.uniqueId('refreshFlag_'));
    }).catch((error) => {
      // 处理错误
      console.error('删除用户出错', error);
    });
  }






  return (
    <PageLayout title={t('user.title')} icon={<UserOutlined />}>

      <div style={{ display: 'flex', width: '100%' }} className='user_management'>
        <div style={{ width: '245px', display: 'list-item' }}>
          <div className='sub-title'>
            团队列表
            <PlusSquareOutlined
              className='user_add_group_button'
              onClick={() => {
                handleClick(ActionType.CreateTeam, 0, "team");
              }}
            />
          </div>
          <Tree
            onSelect={(keys, e) => {
              console.log(e)
              setTeamId(e.node.id);
              if (e.node.id > 0) {
                setTeamInfo(e.node)
              } else {
                setTeamInfo(undefined)
              }
              setSelectedKeys([e.node.id]);
              setRefreshFlag(_.uniqueId('refresh_flag'));
            }}
            className='left_tree'
            titleRender={titleRender}
            treeData={treeData}
            showLine
            selectedKeys={selectedKeys}
            // expandedKeys={expandedKeys}
            defaultExpandedKeys={expandedKeys}
            defaultExpandAll={true}
            fieldNames={{ key: 'id' }}
            onExpand={(keys) => setExpandedKeys(keys)}
          ></Tree>
        </div>
        <div className='user-manage-content' style={{ marginLeft: '10px' }}>
          <div className='user-content'>
            {teamInfo && teamInfo.name && (

              <Row className='team-info'>
                <Col
                  span='24'
                  style={{
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    display: 'inline',
                  }}
                >
                  {teamInfo && teamInfo.name}
                  <EditOutlined
                    style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                    }}
                    onClick={() => handleClick(ActionType.EditTeam, teamId, "team")}
                  ></EditOutlined>
                  <DeleteOutlined
                    style={{
                      marginLeft: '8px',
                      fontSize: '14px',
                    }}
                    onClick={() => {
                      confirm({
                        title: t('common:confirm.delete'),
                        onOk: () => {
                          deleteTeam("" + teamId).then((_) => {
                            message.success(t('common:success.delete'));
                            // handleClose(true);
                            loadingTree();
                            setTeamId(0)
                            setTeamInfo(undefined)
                          });
                        },
                        onCancel: () => { },
                      });
                    }}
                  />
                </Col>
                <Col
                  style={{
                    marginTop: '8px',
                    color: '#666',
                  }}
                >
                  <Space>
                    <span>
                      {t('common:table.note')}：{teamInfo?.note ? teamInfo.note : '-'}
                    </span>
                    <span>
                      {t('common:table.update_by')}：{teamInfo?.update_by ? teamInfo.update_by : '-'}
                    </span>
                    <span>
                      {t('common:table.update_at')}：{teamInfo?.update_at ? moment.unix(teamInfo.update_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
                    </span>
                  </Space>
                </Col>
              </Row>

            )}
            <div className='layer_2'>
              <Space>
              <div className='event-table-search-left'>

                <Select
                  placeholder="选择过滤器"
                  style={{ width: 300 }}
                  allowClear
                  onChange={(value) => {
                    queryFilter.forEach((item) => {
                      if (item.name == value) {
                        setFilterType(item.type);
                        setFilterName(item.name);

                      }
                    })
                    setFilterParam(value);
                    setSearchVal(null)
                  }}>
                  {queryFilter.map((item, index) => (
                    <option value={item.name} key={index}>{item.label}</option>
                  ))
                  }
                </Select>
              </div>

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
                  options={filterOptions[filterParam] ? filterOptions[filterParam] : []}
                  onChange={(val) => setSearchVal(val)}
                  placeholder={'选择要查询的条件'}
                />
              )}
              </Space>
              <div className='event-table-search-right'>
                <Button className='btn' type="primary" onClick={() => { handleOperateClick("add") }}>新增
                </Button>
                {profile.roles?.includes('Admin') && (
                  <div className='user-manage-operate-list'>
                    <Dropdown
                      trigger={['click']}
                      overlay={
                        <Menu onClick={({ key }) => {
                          handleOperateClick(key)
                        }} items={menu.items} />

                      }>
                      <Select style={{ width: '100px', marginLeft: '10px' }}
                        placeholder="操作"
                        allowClear={true}
                        onChange={onStatusChange}
                        options={statusOptions}></Select>

                    </Dropdown>
                  </div>
                )}
              </div>
            </div>
            <Table
              size='small'
              rowKey='id'
              className='user_table_list'
              columns={userColumns}
              bordered
              rowSelection={rowSelection}
              {...tableProps}
              pagination={{
                ...tableProps.pagination,
                ...pagination,
              }}
            />
          </div>
          <UserInfoModal
            visible={visible}
            action={action as ActionType}
            width={650}
            userType={(actionType == 'team') ? UserType.Team : UserType.User}
            onClose={handleClose}
            onSearch={event => {
              if (action == '创建团队') {
                loadingTree();
              }
            }}
            userId={userId > 0 ? "" + userId : undefined}
            teamId={teamId > 0 ? "" + teamId : undefined}
          />
          <OperationModal
            operateType={operateType}
            width={650}
            theme={''}
            setOperateType={setOperateType}
            initData={selectedRows}
            reloadList={async (value: any, operateType: string) => {
              // if(operateType=='changeCatalog'){
              // }
              setRefreshFlag(_.uniqueId('refreshFlag_'));
              onSelectNone();
            }}
          />
        </div>
      </div>
    </PageLayout>
  );
};

export default Resource;