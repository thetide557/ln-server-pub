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
import React, { useEffect, useState } from 'react';
import { Button, Checkbox, Col, Dropdown, Menu, Modal, Radio, RadioChangeEvent, Row, Select, Space, Switch } from 'antd';

import { IRawTimeRange, TimeRangePickerWithRefresh } from '@/components/TimeRangePicker';
import VariableConfig, { IVariable } from '../VariableConfig';
import { dashboardTimeCacheKey } from './Detail';
import { useHistory } from 'react-router-dom';
import { useLocation } from 'react-use';
import moment from 'moment';
import _ from 'lodash';

interface IProps {
  dashboard: any;
  range: IRawTimeRange;
  setRange: (range: IRawTimeRange) => void;
  variableConfig?: IVariable[];
  handleVariableChange: (value, b, valueWithOptions) => void;
  id: string;
  stopAutoRefresh: () => void;
  handlePanelChange: (v: any[]) => void;
}

export default function BoardTitle(props: IProps) {
  const { dashboard, range, setRange, variableConfig, handleVariableChange, id, stopAutoRefresh, handlePanelChange } = props;
  const history = useHistory();
  const location = useLocation();

  const shotCutChange = (val: RadioChangeEvent) => {
    setRange({
      start: moment().subtract(val.target.value, 'minutes'),
      end: moment(),
      refreshFlag: _.uniqueId('refreshFlag_ '),
    });
  };

  return (
    <div className='dashboard-detail-header'>
      <div className='dashboard-detail-header-left'>
        <Radio.Group onChange={(val) => shotCutChange(val)}>
          <Radio.Button value={60}>近1小时</Radio.Button>
          <Radio.Button value={60 * 3}>近3小时</Radio.Button>
          <Radio.Button value={60 * 12}>近12小时</Radio.Button>
          <Radio.Button value={60 * 24}>近24小时</Radio.Button>
          <Radio.Button value={60 * 24 * 7}>近7天</Radio.Button>
          <Radio.Button value={60 * 24 * 30}>近30天</Radio.Button>
        </Radio.Group>
      </div>

      <div className='dashboard-detail-header-right'>
        <Space>
          <Button
            onClick={() => {
              history.push(`/dashboards/${dashboard.id}${location.search}`);
            }}
          >
            设置
          </Button>
          {variableConfig && <VariableConfig isPreview onChange={handleVariableChange} value={variableConfig} range={range} id={id} onOpenFire={stopAutoRefresh} />}
          <TimeRangePickerWithRefresh
            localKey={dashboardTimeCacheKey}
            dateFormat='YYYY-MM-DD HH:mm:ss'
            // refreshTooltip={t('refresh_tip', { num: getStepByTimeAndStep(range, step) })}
            value={range}
            onChange={setRange}
          />
        </Space>
      </div>
    </div>
  );
}
