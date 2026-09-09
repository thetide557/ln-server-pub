import React, { useContext, useMemo } from 'react';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import { CommonStateContext } from '@/App';
import './locale';

interface Props {
  allowedPerms: string | string[];
  children: JSX.Element;
  showUnauthorized?: boolean;
}

export default function index(props: Props) {
  const { t } = useTranslation();
  // step6f（ES 升级轮）：fe v9.1.0 的 ICommonState 里权限点数组叫 `perms`，
  // 羚牛 pub 里叫 `permList`（`src/App.tsx:87`）。pub 现有文件不许改，这里改成读 permList。
  const { permList: perms } = useContext(CommonStateContext);
  const { allowedPerms, children, showUnauthorized } = props;
  const authorized = useMemo(() => {
    return _.every(allowedPerms, (perm) => _.includes(perms, perm));
  }, [allowedPerms, perms]);

  if (authorized) {
    return React.cloneElement(children, _.omit(props, ['allowedPerms', 'children', 'showUnauthorized']));
  }
  if (showUnauthorized) {
    return <>{t('unauthorized')}</>;
  }
  return null;
}

export const useIsAuthorized = (allowedPerms: string[]) => {
  // step6f：同上，fe 的 perms 在 pub 里叫 permList。
  const { permList: perms } = useContext(CommonStateContext);
  return useMemo(() => {
    return _.every(allowedPerms, (perm) => _.includes(perms, perm));
  }, [allowedPerms, perms]);
};
