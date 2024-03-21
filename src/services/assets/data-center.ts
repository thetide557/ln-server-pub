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

export const getDataCenterList = function (params) {
  return request('/api/n9e/datacenter/list', {
    method: RequestMethod.Get,
    params
  });
};
export const addDataCenter = function (data) {
  return request('/api/n9e/datacenter', {
       method: RequestMethod.Post,
       data
  });
};

export const getDataCenterById = function (id) {
  return request('api/n9e/datacenter/'+id, {
    method: RequestMethod.Get
  });
};


export const updateDataCenter = function (data) {
  return request('/api/n9e/datacenter', {
       method: RequestMethod.Put,
       data
  });
};

export const deleteDataCenter = function (id) {
  return request('/api/n9e/datacenter/'+id, {
       method: RequestMethod.Delete
  });
};

