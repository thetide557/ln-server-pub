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
import React from 'react';
import { useLocation } from 'react-router-dom';
import queryString from 'query-string';
import { LineChartOutlined } from '@ant-design/icons';
import _ from 'lodash';
import { useTranslation } from 'react-i18next';
import PageLayout from '@/components/pageLayout';
import Explorer from './Explorer';
import './index.less';

const MetricExplorerPage = () => {
  const { t } = useTranslation('explorer');
  const location = useLocation();
  const { search } = location;
  const { prom_ql } = queryString.parse(search);
  // console.log(queryString.parse(search));
  const fromXhMonitor = (location.state as { isops?: boolean } | null)?.isops === true;
  // 仅当“从 /xh/monitor 跳转”时，返回固定跳回 /xh/monitor；其他来源保持 PageLayout 默认 goBack 行为
  const backPath = fromXhMonitor ? '/xh/monitor' : undefined;
  const backState = backPath ? { isops: true } : undefined;
  
  return (
    <PageLayout
      title={t('title')}
      icon={<LineChartOutlined />}
      showBack={prom_ql ? true : false}
      {...(backPath ? { backPath, backState } : {})}
    >
      <div className='prometheus-page'>
        <Explorer type='metric' defaultCate='prometheus' />
      </div>
    </PageLayout>
  );
};

export default MetricExplorerPage;
