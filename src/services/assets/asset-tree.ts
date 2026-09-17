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

export const updateAssetCategoryInAsset = function (parentId,assetIds) {
  return request('/api/n9e/asset-tree/transfer?parent='+parentId, {
    method: RequestMethod.Post,
    data:assetIds
  });
};

export const addAssetTree = function (data) {
  return request('/api/n9e/asset-tree', {
    method: RequestMethod.Post,
    data
  });
};
export const updateAssetTree = function (data) {
  return request('/api/n9e/asset-tree', {
    method: RequestMethod.Put,
    data
  });
};
export const deleteAssetTree = function (id) {
  return request('/api/n9e/asset-tree/'+id, {
    method: RequestMethod.Delete
  });
};
export const getAssetTreeBelongId = function (data) {
  return request('/api/n9e/asset-tree/asset', {
    method: RequestMethod.Post,
    data
  });
};




