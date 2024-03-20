import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Button, Dropdown, Form, Input, Menu, message, Modal, Select, Space, Table, Tag, Tooltip } from 'antd';
import PageLayout from '@/components/pageLayout';
import { useTranslation } from 'react-i18next';
import { CheckCircleOutlined, DownOutlined, EyeOutlined, GroupOutlined, SearchOutlined } from '@ant-design/icons';
import { BusinessGroup } from '@/pages/targets';
import { CommonStateContext } from '@/App';

import './locale';
import './style.less';
import _, { debounce } from 'lodash';
import Add from './Add';
import Edit from './Edit';

import { assetsType } from '@/store/assetsInterfaces';
import { bindTags, deleteAssets, getAssets, getAssetsTags, moveTargetBusi, unbindTags, updateAssetNote } from '@/services/assets';
import RefreshIcon from '@/components/RefreshIcon';
import { Link, useHistory } from 'react-router-dom';
import classNames from 'classnames';
import { getBusiGroups } from '@/services/common';
import PromQueryBuilderItemModal from '@/components/PromQueryBuilder/PromQueryBuilderItemModal';
import { IRawTimeRange } from '@/components/TimeRangePicker';

export { Add, Edit };

enum OperateType {
  BindTag = 'bindTag',
  UnbindTag = 'unbindTag',
  UpdateBusi = 'updateBusi',
  RemoveBusi = 'removeBusi',
  UpdateNote = 'updateNote',
  Delete = 'delete',
  None = 'none',
}

const { TextArea } = Input;

const OperationModal = ({ operateType, setOperateType, assets, names, reloadList }) => {
  const { t } = useTranslation('assets');
  const { busiGroups } = useContext(CommonStateContext);
  const [form] = Form.useForm();
  const [confirmLoading, setConfirmLoading] = useState<boolean>(false);
  const [assetsList, setAssetsList] = useState<string[]>(assets);
  const [tagsList, setTagsList] = useState<string[]>([]);
  const detailProp = operateType === OperateType.UnbindTag ? tagsList : busiGroups;

  // 绑定标签弹窗内容
  const bindTagDetail = () => {
    // 校验单个标签格式是否正确
    function isTagValid(tag) {
      const contentRegExp = /^[a-zA-Z_][\w]*={1}[^=]+$/;
      return {
        isCorrectFormat: contentRegExp.test(tag.toString()),
        isLengthAllowed: tag.toString().length <= 64,
      };
    }

    // 渲染标签
    function tagRender(content) {
      const { isCorrectFormat, isLengthAllowed } = isTagValid(content.value);
      return isCorrectFormat && isLengthAllowed ? (
        <Tag closable={content.closable} onClose={content.onClose}>
          {content.value}
        </Tag>
      ) : (
        <Tooltip title={isCorrectFormat ? t('bind_tag.render_tip1') : t('bind_tag.render_tip2')}>
          <Tag color='error' closable={content.closable} onClose={content.onClose} style={{ marginTop: '2px' }}>
            {content.value}
          </Tag>
        </Tooltip>
      );
    }

    // 校验所有标签格式
    function isValidFormat() {
      return {
        validator(_, value) {
          const isInvalid = value.some((tag) => {
            const { isCorrectFormat, isLengthAllowed } = isTagValid(tag);
            if (!isCorrectFormat || !isLengthAllowed) {
              return true;
            }
          });
          return isInvalid ? Promise.reject(new Error(t('bind_tag.msg2'))) : Promise.resolve();
        },
      };
    }

    return {
      operateTitle: t('bind_tag.title'),
      requestFunc: bindTags,
      isFormItem: true,
      render() {
        return (
          <Form.Item label={t('common:table.tag')} name='tags' rules={[{ required: true, message: t('bind_tag.msg1') }, isValidFormat]}>
            <Select mode='tags' tokenSeparators={[' ']} open={false} placeholder={t('bind_tag.placeholder')} tagRender={tagRender} />
          </Form.Item>
        );
      },
    };
  };

  // 解绑标签弹窗内容
  const unbindTagDetail = (tagsList) => {
    return {
      operateTitle: t('unbind_tag.title'),
      requestFunc: unbindTags,
      isFormItem: true,
      render() {
        return (
          <Form.Item label={t('common:table.tag')} name='tags' rules={[{ required: true, message: t('unbind_tag.msg') }]}>
            <Select mode='multiple' showArrow={true} placeholder={t('unbind_tag.placeholder')} options={tagsList.map((tag) => ({ label: tag, value: tag }))} />
          </Form.Item>
        );
      },
    };
  };

  // 移出业务组弹窗内容
  const removeBusiDetail = () => {
    return {
      operateTitle: t('remove_busi.title'),
      requestFunc: moveTargetBusi,
      isFormItem: false,
      render() {
        return <Alert message={t('remove_busi.msg')} type='error' />;
      },
    };
  };

  // 修改备注弹窗内容
  const updateNoteDetail = () => {
    return {
      operateTitle: t('update_note.title'),
      requestFunc: updateAssetNote,
      isFormItem: true,
      render() {
        return (
          <Form.Item label={t('common:table.note')} name='note'>
            <Input maxLength={64} placeholder={t('update_note.placeholder')} />
          </Form.Item>
        );
      },
    };
  };

  // 批量删除弹窗内容
  const deleteDetail = () => {
    return {
      operateTitle: t('batch_delete.title'),
      requestFunc: deleteAssets,
      isFormItem: false,
      render() {
        return <Alert message={t('batch_delete.msg')} type='error' />;
      },
    };
  };

  // 修改业务组弹窗内容
  const updateBusiDetail = (busiGroups) => {
    return {
      operateTitle: t('update_busi.title'),
      requestFunc: moveTargetBusi,
      isFormItem: true,
      render() {
        return (
          <Form.Item label={t('update_busi.label')} name='bgid' rules={[{ required: true }]}>
            <Select
              showSearch
              style={{ width: '100%' }}
              options={filteredBusiGroups.map(({ id, name }) => ({
                label: name,
                value: id,
              }))}
              optionFilterProp='label'
              filterOption={false}
              onSearch={handleSearch}
              onFocus={() => {
                getBusiGroups('').then((res) => {
                  setFilteredBusiGroups(res.dat || []);
                });
              }}
              onClear={() => {
                getBusiGroups('').then((res) => {
                  setFilteredBusiGroups(res.dat || []);
                });
              }}
            />
          </Form.Item>
        );
      },
    };
  };

  const operateDetail = {
    bindTagDetail,
    unbindTagDetail,
    updateBusiDetail,
    removeBusiDetail,
    updateNoteDetail,
    deleteDetail,
    noneDetail: () => ({
      operateTitle: '',
      requestFunc() {
        return Promise.resolve();
      },
      isFormItem: false,
      render() {},
    }),
  };
  const { operateTitle, requestFunc, isFormItem, render } = operateDetail[`${operateType}Detail`](detailProp);
  const [filteredBusiGroups, setFilteredBusiGroups] = useState(busiGroups);
  function formatValue() {
    const inputValue = form.getFieldValue('ids');
    const formattedIds = inputValue.split(/[ ,\n]+/).filter((value) => value);
    const formattedValue = formattedIds.join('\n');
    // 自动格式化表单内容
    if (inputValue !== formattedValue) {
      form.setFieldsValue({
        ids: formattedValue,
      });
    }
    // 当对象标识变更时，更新标识数组
    if (assetsList.sort().join('\n') !== formattedIds.sort().join('\n')) {
      setAssetsList(formattedIds);
    }
  }

  // 提交表单
  function submitForm() {
    form.validateFields().then((data) => {
      setConfirmLoading(true);
      data.ids = data.ids.split('\n');
      requestFunc(data)
        .then(() => {
          setOperateType(OperateType.None);
          reloadList();
          form.resetFields();
          setConfirmLoading(false);
        })
        .catch(() => setConfirmLoading(false));
    });
  }

  // 初始化展示所有业务组
  useEffect(() => {
    if (!filteredBusiGroups.length) {
      setFilteredBusiGroups(busiGroups);
    }
  }, [busiGroups]);

  const fetchBusiGroup = (e) => {
    getBusiGroups(e).then((res) => {
      setFilteredBusiGroups(res.dat || []);
    });
  };
  const handleSearch = useCallback(debounce(fetchBusiGroup, 800), []);

  // 点击批量操作时，初始化默认监控对象列表
  useEffect(() => {
    if (operateType !== OperateType.None) {
      setAssetsList(assets);
      form.setFieldsValue({
        names: names.join('\n'),
      });
      form.setFieldsValue({
        ids: assets.join('\n'),
      });
    }
  }, [operateType, assets]);

  // 解绑标签时，根据输入框监控对象动态获取标签列表
  useEffect(() => {
    if (operateType === OperateType.UnbindTag && assetsList.length) {
      getAssetsTags({ ids: assetsList.join(',') }).then(({ dat }) => {
        // 删除多余的选中标签
        const curSelectedTags = form.getFieldValue('tags') || [];
        form.setFieldsValue({
          tags: curSelectedTags.filter((tag) => dat.includes(tag)),
        });

        setTagsList(dat);
      });
    }
  }, [operateType, assetsList]);

  return (
    <Modal
      visible={operateType !== 'none'}
      title={operateTitle}
      confirmLoading={confirmLoading}
      okButtonProps={{
        danger: operateType === OperateType.RemoveBusi || operateType === OperateType.Delete,
      }}
      okText={operateType === OperateType.RemoveBusi ? t('remove_busi.btn') : operateType === OperateType.Delete ? t('batch_delete.btn') : t('common:btn.ok')}
      onOk={submitForm}
      onCancel={() => {
        setOperateType(OperateType.None);
        form.resetFields();
      }}
    >
      {/* 基础展示表单项 */}
      <Form form={form} labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
        <Form.Item name='ids' rules={[{ required: true }]} hidden>
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }} onBlur={formatValue} />
        </Form.Item>
        <Form.Item label={t('assets')} name='names' rules={[{ required: true }]}>
          <TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder={t('assets_placeholder')} onBlur={formatValue} readOnly />
        </Form.Item>
        {isFormItem && render()}
      </Form>
      {!isFormItem && render()}
    </Modal>
  );
};

export default function () {
  const { t } = useTranslation('assets');
  const commonState = useContext(CommonStateContext);
  const [list, setList] = useState<any[]>([]);
  const [curBusiId, setCurBusiId] = useState<number>(commonState.curBusiId);
  const [operateType, setOperateType] = useState<OperateType>(OperateType.None);
  const [selectedAssets, setSelectedAssets] = useState<number[]>([]);
  const [selectedAssetsName, setSelectedAssetsName] = useState<string[]>([]);
  const history = useHistory();
  const [searchVal, setSearchVal] = useState('');
  const [refreshKey, setRefreshKey] = useState(_.uniqueId('refreshKey_'));
  const [range, setRange] = useState<IRawTimeRange>({ start: 'now-1h', end: 'now' });

  useEffect(() => {
    getAssets(curBusiId, searchVal, null).then((res) => {
      setList(res.dat);
    });
  }, [searchVal, refreshKey, curBusiId]);

  return (
    <PageLayout icon={<GroupOutlined />} title={t('title')}>
      <div style={{ display: 'flex' }}>
        <BusinessGroup
          curBusiId={curBusiId}
          setCurBusiId={(id) => {
            commonState.setCurBusiId(id);
            setCurBusiId(id);
          }}
          renderHeadExtra={() => {
            return (
              <div>
                <div className='left-area-group-title'>{t('default_filter')}</div>
                <div
                  className={classNames({
                    'n9e-metric-views-list-content-item': true,
                    active: curBusiId === 0,
                  })}
                  onClick={() => {
                    commonState.setCurBusiId(0);
                    setCurBusiId(0);
                  }}
                >
                  {t('ungrouped_assets')}
                </div>
                <div
                  className={classNames({
                    'n9e-metric-views-list-content-item': true,
                    active: curBusiId === -1,
                  })}
                  onClick={() => {
                    commonState.setCurBusiId(-1);
                    setCurBusiId(-1);
                  }}
                >
                  {t('all_assets')}
                </div>
              </div>
            );
          }}
        />
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
                    history.push(`/assets/add/${curBusiId}`);
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
                      onClick={({ key }) => {
                        setOperateType(key as OperateType);
                      }}
                    >
                      <Menu.Item key={OperateType.BindTag}>{t('bind_tag.title')}</Menu.Item>
                      <Menu.Item key={OperateType.UnbindTag}>{t('unbind_tag.title')}</Menu.Item>
                      <Menu.Item key={OperateType.UpdateBusi}>{t('update_busi.title')}</Menu.Item>
                      <Menu.Item key={OperateType.RemoveBusi}>{t('remove_busi.title')}</Menu.Item>
                      <Menu.Item key={OperateType.UpdateNote}>{t('update_note.title')}</Menu.Item>
                      <Menu.Item key={OperateType.Delete}>{t('batch_delete.title')}</Menu.Item>
                    </Menu>
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
            />
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
