import React, { useContext } from 'react';
import { CommonStateContext } from '@/App';
import { Popover } from 'antd';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface IProps {
  // n20 块 0：fe 同路径 :12 有 `type?: 'metric' | 'logging'`，羚牛这版没有；
  // DatasourceSelectV3/index.tsx:219 会传 type。只加这个可选 prop、**组件体一个字没动**，
  // 所以本轮它只是被接受、不被使用：弹窗里的「去配置数据源」链接仍按羚牛原有的 :17 算
  // （时序源那一条），不会像 fe 那样在 type==='logging' 时换成日志源那条链接。
  // 行为差异登记在 W-0-拿不准.md U-05，留给块 6 联调时再定要不要补。
  type?: 'metric' | 'logging';
  datasourceList: any[];
  children: React.ReactNode;
}

export default function EmptyDatasourcePopover(props: IProps) {
  const { t } = useTranslation();
  const { profile } = useContext(CommonStateContext);
  const { datasourceList, children } = props;
  const linkUrl = import.meta.env.VITE_IS_ENT === 'true' ? '/settings/source/timeseries' : '/help/source';

  return (
    <Popover
      content={
        <>
          {t('common:datasource.empty_modal.title')} {_.includes(profile?.roles, 'Admin') ? <Link to={linkUrl}>{t('common:datasource.empty_modal.btn1')}</Link> : null}
        </>
      }
      visible={_.isEmpty(datasourceList)}
      placement='top'
    >
      {children}
    </Popover>
  );
}
