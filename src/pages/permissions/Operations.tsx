// @ts-nocheck
import React, { useState, useEffect, Fragment, useContext } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Tree, Button, Modal, message } from 'antd';
import { CommonStateContext } from '@/App';
import { getOperationsByRole, putOperationsByRole } from './services';
import { OperationType } from './types';
import './style.less'
function transformOperations(operations: OperationType[]) {
  return _.map(operations, (item) => {
    return {
      title: item.cname,
      key: item.name,
      children: _.map(item.ops, (item) => {
        return {
          title: item,
          key: item,
        };
      }) as {
        title: string;
        key: string;
      }[],
    };
  });
}

interface IProps {
  data: OperationType[];
  roleId?: number;
  disabled: boolean;
}

export default function Operations(props: IProps) {
  const { t } = useTranslation('permissions');
  const { data, roleId, disabled } = props;
  const [operations, setOperations] = useState<string[]>([]);
  const { profile, permList } = useContext(CommonStateContext);

  useEffect(() => {
    // console.log(111, disabled);
    
    if (roleId) {
      getOperationsByRole(roleId).then((res) => {
        setOperations(res);
      });
    }
  }, [roleId]);

  if (!roleId) return <div>请先选择角色</div>;

  return (
    <Fragment>
      <Tree
        checkable
        disabled={disabled}
        className='roles-tree_permissions'
        checkedKeys={operations}
        treeData={data}
        fieldNames={{
          title: 'cname',  // 指定显示名称的字段名
          key: 'name',       // 指定唯一标识的字段名
          children: 'ops', // 指定子节点列表的字段名
        }}
        onCheck={(selectedKeys: string[]) => {
          console.log(selectedKeys);
          setOperations(selectedKeys);
        }}
      />
      {!disabled && (
        <div style={{ marginTop: 16 }}>
          {
            (profile.roles?.includes("Admin") || permList.includes("/permissions/save")) && <Button
              type='primary'
              onClick={() => {
                Modal.confirm({
                  title: t('common:confirm.save'),
                  onOk: () => {
                    putOperationsByRole(
                      roleId,
                      _.filter(operations, (item) => {
                        return !_.includes(_.map(data, 'name'), item);
                      }),
                    ).then(() => {
                      message.success(t('common:success.save'));
                    });
                  },
                });
              }}
            >
              {t('common:btn.save')}
            </Button>
          }
        </div>
      )}
    </Fragment>
  );
}
