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

export const getScrapList = function (params) {
  let page= params["page"];
  let limit= params["limit"];
  delete params["limit"];
  delete params["page"];
  return request('/api/n9e/device-scrap?limit='+limit+'&page='+page, {
    method: RequestMethod.Get,
    params
  });
};


export const addScrap = function (data) {
  let  tree = data["tree"];
  delete data["tree"];
  return request('/api/n9e/device-scrap?tree='+tree, {
       method: RequestMethod.Post,
       data
  });
};
