import React from 'react';
import { Alert } from 'antd';
import { useTranslation } from 'react-i18next';

import { DatasourceCateEnum } from '@/utils/constant';
import { DefaultFormValuesControl, RenderCommonSettings } from '@/pages/logExplorer/types';
import { NAME_SPACE } from '@/pages/logExplorer/constants';

import Elasticsearch from '@/plugins/elasticsearch/ExplorerNG';
import VictoriaLogs from '@/plugins/victorialogs/ExplorerNG';
import Loki from '@/plugins/loki/ExplorerNG';
// N20 lead 加（统一尺子第五节）：羚牛的 i18n 是静态 resources、不自动收集各源 locale，要有人 import 才会注册；
// 不加界面上会显示成 elasticsearch.xxx 这样的翻译键原文（n19 估量 R-08）。victorialogs 的别处已有 import，这里再 import 一次是幂等的。
import '@/plugins/elasticsearch/locale';
import '@/plugins/loki/locale';
import '@/plugins/victorialogs/locale';

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

  if (datasourceCate === DatasourceCateEnum.elasticsearch) {
    return <Elasticsearch tabKey={tabKey} defaultFormValuesControl={defaultFormValuesControl} renderCommonSettings={renderCommonSettings} />;
  }

  if (datasourceCate === DatasourceCateEnum.victorialogs) {
    return <VictoriaLogs tabKey={tabKey} defaultFormValuesControl={defaultFormValuesControl} renderCommonSettings={renderCommonSettings} />;
  }

  if (datasourceCate === DatasourceCateEnum.loki) {
    return <Loki tabKey={tabKey} defaultFormValuesControl={defaultFormValuesControl} renderCommonSettings={renderCommonSettings} />;
  }

  return <Alert showIcon className='m-4' type='error' message={t('unsupported_datasource_type', { type: datasourceCate })} />;
}
