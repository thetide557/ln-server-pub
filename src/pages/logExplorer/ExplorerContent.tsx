import React from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import { DatasourceCateEnum } from '@/utils/constant';
import { DefaultFormValuesControl, RenderCommonSettings } from '@/pages/logExplorer/types';
import { NAME_SPACE } from '@/pages/logExplorer/constants';

// n20-TODO-源分发: elasticsearch
// import Elasticsearch from '@/plugins/elasticsearch/ExplorerNG';
// n20-TODO-源分发: victorialogs
// import VictoriaLogs from '@/plugins/victorialogs/ExplorerNG';
// n20-TODO-源分发: loki
// import Loki from '@/plugins/loki/ExplorerNG';

interface Props {
  tabKey: string;
  datasourceCate?: DatasourceCateEnum;
  defaultFormValuesControl?: DefaultFormValuesControl;
  renderCommonSettings: RenderCommonSettings;
}

export default function index(props: Props) {
  const { tabKey, datasourceCate, defaultFormValuesControl, renderCommonSettings } = props;
  const { t } = useTranslation(NAME_SPACE);

  if (!datasourceCate) {
    return null;
  }

  // n20-TODO-源分发: elasticsearch
  //   if (datasourceCate === DatasourceCateEnum.elasticsearch) {
  //     return <Elasticsearch tabKey={tabKey} defaultFormValuesControl={defaultFormValuesControl} renderCommonSettings={renderCommonSettings} />;
  //   }

  // n20-TODO-源分发: victorialogs
  //   if (datasourceCate === DatasourceCateEnum.victorialogs) {
  //     return <VictoriaLogs tabKey={tabKey} defaultFormValuesControl={defaultFormValuesControl} renderCommonSettings={renderCommonSettings} />;
  //   }

  // n20-TODO-源分发: loki
  //   if (datasourceCate === DatasourceCateEnum.loki) {
  //     return <Loki tabKey={tabKey} defaultFormValuesControl={defaultFormValuesControl} renderCommonSettings={renderCommonSettings} />;
  //   }

  return <Alert showIcon className='m-4' type='error' message={t('unsupported_datasource_type', { type: datasourceCate })} />;
}
