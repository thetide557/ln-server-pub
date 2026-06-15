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
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// 获取告警详情
export function getAlertEventsById(eventId) {
  let url = '/api/n9e/alert-cur-event';
  if (import.meta.env.VITE_IS_ENT === 'true') {
    url = '/api/n9e-plus/alert-cur-event';
  }
  return request(`${url}/${eventId}`, {
    method: RequestMethod.Get,
  });
}

export function getHistoryEventsById(eventId) {
  let url = '/api/n9e/alert-his-event';
  if (import.meta.env.VITE_IS_ENT === 'true') {
    url = '/api/n9e-plus/alert-his-event';
  }
  return request(`${url}/${eventId}`, {
    method: RequestMethod.Get,
  });
}

export function getWarningChart(params, id) {
  return request(`/api/n9e/proxy/${id}/api/v1/query_range`, {
    method: RequestMethod.Post,
    params
  });
}

// 设置屏蔽规则
export function setAlartMutes(data, id) {
  return request( `/api/n9e/busi-group/${id}/alert-mutes`, {
    method: RequestMethod.Post,
    data
  });
}

// 处理当前告警
export function updataprocess(params) {
  return request(`/api/n9e/alert-cur-events/updataprocess`, {
    method: RequestMethod.Get,
    params
  });
}