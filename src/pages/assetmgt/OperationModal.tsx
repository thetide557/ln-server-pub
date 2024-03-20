import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Form, Input, Modal, Select, Tag, Tooltip, TreeSelect } from 'antd';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import { debounce } from 'lodash';
import { bindTags, deleteAssets, getAssetsTags, moveTargetBusi, unbindTags, updateAssetNote, changeAssetOrganization } from '@/services/assets';
import { getBusiGroups } from '@/services/common';
import { OperateType } from './index';

export const OperationModal = ({ operateType, setOperateType, assets, names, reloadList, treeData }) => {
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
  const changeOrganizeDetail = () => {
    return {
      operateTitle: t('变更资产所属组织树'),
      requestFunc: changeAssetOrganization,
      isFormItem: true,
      render() {
        return (
          <Form.Item label={t('所属组织树')} name='id' rules={[{ required: true, message: t('请选择组织树') }]}>
            <TreeSelect
              showSearch
              style={{ width: '100%' }}
              dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
              placeholder='请选择所属组织机构'
              allowClear
              treeData={treeData}
              fieldNames={{ label: 'name', value: 'id', children: 'children' }}
              treeDefaultExpandAll={true}
            ></TreeSelect>
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
    changeOrganizeDetail,
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
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} onBlur={formatValue} />
        </Form.Item>
        <Form.Item label={t('assets')} name='names' rules={[{ required: true }]}>
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder={t('assets_placeholder')} onBlur={formatValue} readOnly />
        </Form.Item>
        {isFormItem && render()}
      </Form>
      {!isFormItem && render()}
    </Modal>
  );
};
