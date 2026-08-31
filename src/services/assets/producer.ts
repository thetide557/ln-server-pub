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

export const getProducersByType = function (type) {
  return request('/api/n9e/device-producer/getName?type='+type, {
       method: RequestMethod.Get
  });
};
export const getProducersListByType = function (type,data) {
  return request('/api/n9e/device-producer/list?type='+type, {
       method: RequestMethod.Get,
       params:data
  });
};
export const getProducerList = function () {
  return request('/api/n9e/device-producer/getName', {
       method: RequestMethod.Get
  });
};
export const addDeviceProducer = function (data) {
  return request('/api/n9e/device-producer', {
       method: RequestMethod.Post,
       data
  });
};
export const updateDeviceProducer = function (data) {
  return request('/api/n9e/device-producer', {
       method: RequestMethod.Put,
       data
  });
};

export const deleteDeviceProducer = function (data) {
  return request('/api/n9e/device-producer/batch-del', {
    method: RequestMethod.Post,
    data
  });
};