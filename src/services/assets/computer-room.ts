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

export const getRoomList = function (params) {
  return request('/api/n9e/computer-room/list', {
    method: RequestMethod.Get,
    params
  });
};
export const addRoom = function (data) {
  return request('/api/n9e/computer-room', {
       method: RequestMethod.Post,
       data
  });
};

export const getRoomListByDatacenterId = function (centerId) {
  return request('/api/n9e/computer-room/datacenterId?idcLocation='+centerId, {
    method: RequestMethod.Get
  });
};


export const updateRoom = function (data) {
  return request('/api/n9e/computer-room', {
       method: RequestMethod.Put,
       data
  });
};

export const deleteRoom = function (id) {
  return request('/api/n9e/computer-room/'+id, {
       method: RequestMethod.Delete
  });
};