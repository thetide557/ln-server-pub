import React, { useContext, useEffect, useState } from 'react';
import { Button, Dropdown, Input, Menu, message, Modal, Space, Table, Tag, Tree, Switch } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CheckCircleOutlined, DownOutlined, GroupOutlined, SearchOutlined } from '@ant-design/icons';
import { EditOutlined, PlusOutlined, MinusOutlined, CloseOutlined, CheckOutlined } from '@ant-design/icons';
const { confirm } = Modal;
import PromQueryBuilderItemModal from '@/components/PromQueryBuilder/PromQueryBuilderItemModal';
import { CommonStateContext } from '@/App';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import './locale';
import './style.less';
import _ from 'lodash';
import Add from './Add';
import Edit from './Edit';
import { assetsType } from '@/store/assetsInterfaces';
import { deleteAssets, getAssets, getOrganizationTree, updateOrganization, deleteOrganization, addOrganization } from '@/services/assets';
import RefreshIcon from '@/components/RefreshIcon';
import { Link, useHistory } from 'react-router-dom';
import { OperationModal } from './OperationModal';
export { Add, Edit };

export enum OperateType {
  BindTag = 'bindTag',
  UnbindTag = 'unbindTag',
  UpdateBusi = 'updateBusi',
  RemoveBusi = 'removeBusi',
  UpdateNote = 'updateNote',
  Delete = 'delete',
  ChangeOrganize = 'changeOrganize',
  None = 'none',
}

export interface OrgType {
  name: string;
  id: number;
  parent_id: number;
  children: OrgType[];
  isEditable?: boolean;
}

interface IProps {
  url?: string;
  datasourceValue: number;
  contentMaxHeight?: number;
  type?: 'table' | 'graph';
  onTypeChange?: (type: 'table' | 'graph') => void;
  defaultTime?: IRawTimeRange | number;
  onTimeChange?: (time: IRawTimeRange) => void; // 用于外部控制时间范围
  promQL?: string;
  graphOperates?: {
    enabled: boolean;
  };
  globalOperates?: {
    enabled: boolean;
  };
  headerExtra?: HTMLDivElement | null;
  executeQuery?: (promQL?: string) => void;
}

export default function (props: IProps) {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const [list, setList] = useState<any[]>([]);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [selectedAssetsName, setSelectedAssetsName] = useState<string[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(commonState.organizationId);
  const [modifySwitch, setModifySwitch] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([selectedOrganizationId]);
  const [searchVal, setSearchVal] = useState('');
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [treeData, setTreeData] = useState<OrgType[]>([
    { id: 0, name: '根节点', parent_id: 0, children: [] },
    { id: -1, name: '全部', parent_id: 0, children: [] },
  ]);
  const { url = '/api/n9e/proxy', datasourceValue = 0, promQL } = props;

  const [modifyType, setModifyType] = useState<boolean>(false);
  const [curValue, setcurValue] = useState<string>('');

  const history = useHistory();
  const [range, setRange] = useState<IRawTimeRange>({ start: 'now-1h', end: 'now' });

  const loadingTree = () => {
    getOrganizationTree({}).then(({ dat }) => {
      treeData[0].children = dat || [];
      setTreeData(treeData.slice());
      setSelectedKeys([selectedOrganizationId]);
    });
  };

  useEffect(() => {
    getAssets(-1, searchVal, selectedOrganizationId).then((res) => {
      setList(res.dat);
    });
  }, [searchVal, refreshKey, selectedOrganizationId]);

  useEffect(() => {
    setExpandedKeys([0]);
    setSelectedKeys([0]);
    loadingTree();
  }, []);

  const titleRender = (node) => {
    if (node.isEditable) {
      return (
        <div>
          <Input
            defaultValue={node.name || ''}
            maxLength={25}
            style={{ width: '200px' }}
            onChange={(e) => {
              setcurValue(e.target.value);
            }}
            onPressEnter={(e) => {
              saveNode(node);
            }}
            onKeyDown={(e) => {
              if (e.code === 'Escape') {
                onClose(node);
              }
            }}
          />
          <CloseOutlined
            style={{ marginLeft: 10 }}
            onClick={() => {
              onClose(node);
            }}
          />
          <CheckOutlined style={{ marginLeft: 10 }} onClick={() => saveNode(node)} />
        </div>
      );
    } else {
      return (
        <div style={{ position: 'relative', width: '100%' }}>
          <span>{node.name}</span>
          <span style={{ position: 'absolute', right: 5 }}>
            {modifyType && node.id > 0 && <EditOutlined style={{ marginLeft: 10 }} onClick={() => editNode(node)} />}
            {modifyType && node.id > -1 && <PlusOutlined style={{ marginLeft: 10 }} onClick={() => addNode(node)} />}
            {modifyType && node.id > -1 && (
              <MinusOutlined
                style={{ marginLeft: 10 }}
                onClick={() => {
                  confirm({
                    title: '确认要删除吗?',
                    onOk: () => {
                      deleteNode(node);
                    },
                  });
                }}
              />
            )}
          </span>
        </div>
      );
    }
  };

  const addNode = (node) => {
    let newId = 0 - parseInt(_.uniqueId());
    if (!node.children) {
      node.children = [];
    }
    node.children.push({
      name: '未定义',
      parent_id: node.id,
      id: newId,
      isEditable: true,
    });
    setTreeData(treeData.slice());
    expandedKeys.push(node.id);
    setExpandedKeys(expandedKeys.slice());
    setModifyType(false);
    setModifySwitch(false);
  };

  const editNode = (node) => {
    node.isEditable = true;
    setModifyType(false);
    setModifySwitch(false);
    setTreeData(treeData.slice());
  };

  const saveNode = (node) => {
    if (node.id > 0) {
      let param = {
        id: node.id,
        name: curValue,
      };
      updateOrganization(param).then(() => {
        loadingTree();
      });
    } else {
      let param = {
        parent_id: node.parent_id,
        name: curValue,
      };
      addOrganization(param).then(() => {
        loadingTree();
      });
    }
    setModifyType(true);
    setModifySwitch(true);
  };

  const deepFind = (items: OrgType[], id): OrgType | null => {
    for (const item of items) {
      if (item.id === id) {
        return item;
      }
      if (item.children) {
        return deepFind(item.children, id);
      }
    }
    return null;
  };

  const onClose = (node) => {
    node.isEditable = false;
    if (node.id < 0) {
      const parentNode = deepFind(treeData, node.parent_id);
      if (parentNode) {
        _.remove(parentNode.children, (v) => v.id === node.id);
      }
    }
    setModifyType(true);
    setModifySwitch(true);
    setTreeData(treeData.slice());
  };

  const deleteNode = (node) => {
    deleteOrganization(node.id).then(() => {
      loadingTree();
    });
  };

  return (
    <PageLayout icon={<GroupOutlined />} title={t('title')}>
      <div style={{ display: 'flex' }}>
        <div style={{ width: '400px', display: 'list-item' }}>
          <span className='organize_title_cls'>组织树列表</span>
          <div style={{ position: 'relative', alignItems: 'revert', display: 'flex', float: 'right', marginRight: '10px', marginTop: '5px' }}>
            <div style={{ margin: '0 10prx ' }}>
              <Switch
                checkedChildren='管理'
                disabled={!modifySwitch}
                defaultChecked={modifyType}
                unCheckedChildren='管理'
                onChange={(checked: boolean) => setModifyType(checked)}
              />
            </div>
          </div>
          <Tree
            onSelect={(keys, e) => {
              setSelectedKeys(keys);
              setSelectedOrganizationId(e.node.id);
              commonState.setOrganizationId(e.node.id);
            }}
            titleRender={titleRender}
            treeData={treeData}
            showLine
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            fieldNames={{ key: 'id' }}
            onExpand={(keys) => setExpandedKeys(keys)}
          ></Tree>
        </div>

        <div className='table-content'>
          <div className='table-header'>
            <Space>
              <RefreshIcon
                onClick={() => {
                  setRefreshKey(_.uniqueId('refreshKey_'));
                }}
              />
              <div className='table-handle-search'>
                <Input
                  className={'searchInput'}
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  prefix={<SearchOutlined />}
                  placeholder={t('search_placeholder')}
                />
              </div>
            </Space>
            <Space>
              <div>
                <Button
                  type='primary'
                  onClick={() => {
                    if (selectedOrganizationId >= 0) {
                      commonState.setOrganizationId(selectedOrganizationId);
                      history.push(`/assetmgt/add/${selectedOrganizationId}`);
                    } else {
                      message.open({
                        type: 'error',
                        content: '请选择组织节点!',
                        duration: 2,
                      });
                    }
                  }}
                >
                  {t('common:btn.add')}
                </Button>
              </div>
              <div>
                <Dropdown
                  trigger={['click']}
                  overlay={
                    <Menu
                      style={{ width: '100px' }}
                      onClick={({ key }) => {
                        setOperateType(key as OperateType);
                      }}
                      items={[
                        { key: OperateType.BindTag, label: t('bind_tag.title') },
                        { key: OperateType.UnbindTag, label: t('unbind_tag.title') },
                        { key: OperateType.UpdateBusi, label: t('update_busi.title') },
                        { key: OperateType.RemoveBusi, label: t('remove_busi.title') },
                        { key: OperateType.UpdateNote, label: t('update_note.title') },
                        { key: OperateType.Delete, label: t('batch_delete.title') },
                        { key: OperateType.ChangeOrganize, label: t('变更组织树') },
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
          <div className='assets-list'>
            <Table
              dataSource={list}
              rowSelection={{
                onChange: (_, rows) => {
                  setSelectedAssets(rows ? rows.map(({ id }) => id) : []);
                  setSelectedAssetsName(rows ? rows.map(({ name }) => name) : []);
                },
              }}
              columns={[
                {
                  title: t('name'),
                  dataIndex: 'name',
                  render(value, record, index) {
                    return <Link to={{ pathname: `/assets/${record.id}` }}>{value}</Link>;
                  },
                },
                {
                  title: t('type'),
                  dataIndex: 'type',
                },
                {
                  title: t('label'),
                  dataIndex: 'label',
                },
                {
                  title: t('tags'),
                  dataIndex: 'tags',
                  render(tagArr) {
                    const content =
                      tagArr &&
                      tagArr.map((item) => (
                        <Tag color='purple' key={item}>
                          {item}
                        </Tag>
                      ));
                    return tagArr && content;
                  },
                },
                {
                  title: t('memo'),
                  dataIndex: 'memo',
                },
                {
                  title: t('status'),
                  dataIndex: 'status',
                  render(value) {
                    return value === 1 ? (
                      <Space>
                        <CheckCircleOutlined style={{ color: 'green' }} />
                        已生效
                      </Space>
                    ) : (
                      <Space>
                        <CheckCircleOutlined style={{ color: 'grey' }} />
                        未生效
                      </Space>
                    );
                  },
                },
                {
                  title: t('common:table.operations'),
                  width: '180px',
                  render: (text: string, record: assetsType) => (
                    <div className='table-operator-area'>
                      <Button size='small' href={record.dashboard}>
                        监控
                      </Button>
                      <Button
                        size='small'
                        onClick={async () => {
                          PromQueryBuilderItemModal({
                            range,
                            datasourceValue: 1,
                            value: record.id.toString(),
                            type: record.type,
                          });
                        }}
                      >
                        {t('指标')}
                      </Button>
                      <Button
                        size='small'
                        className='table-operator-area-warning'
                        onClick={async () => {
                          Modal.confirm({
                            title: t('common:confirm.delete'),
                            onOk: async () => {
                              await deleteAssets({ ids: [record.id.toString()] });
                              message.success(t('common:success.delete'));
                              setRefreshKey(_.uniqueId('refreshKey_'));
                            },

                            onCancel() {},
                          });
                        }}
                      >
                        {t('common:btn.delete')}
                      </Button>
                    </div>
                  ),
                },
              ]}
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
              treeData={[treeData[0]]}
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
