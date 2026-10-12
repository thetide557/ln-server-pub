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

const profileApi = 'api/takin/self/profile';
// 修改个人信息
// ---- N36 批 H1 第 14 条（后端第十份第三节 1，待办 `LN-USER-CONTACTS-SELF-01`）：
// 这条请求必须带 `contacts`。后端在 `POST /api/takin/users` 与 `PUT /api/takin/user/:id/profile`
// 两条上已经把 contacts 兜成 `{}`，但**个人中心自己改资料这条** `PUT /api/takin/self/profile`
// 走的是裸字串、没兜；不带这个字段就会在库里落成空串，空串不是合法 JSON，
// 之后用户列表 `GET /api/takin/users` 与用户详情整个请求都会失败（`sql: Scan error … contacts`）。
// 组装处 `src/pages/account/info.tsx:109-142` 的 `contacts` 来自表单，表单里没填就是 undefined，
// `JSON.stringify` 会把 undefined 的键直接丢掉 —— 所以在这里（只有这一条请求走得到的地方）兜一次 `{}`。
export const UpdateProfile = function (data: object) {
  return request(`/${profileApi}`, {
    method: RequestMethod.Put,
    data: {
      ...data,
      contacts: (data as any)?.contacts ?? {},
    },
  });
};

export const GetProfile = function () {
  return request(`/${profileApi}`, {
    method: RequestMethod.Get,
  });
};

const secretApi = 'api/takin/self/token';
// 获取个人秘钥
export const GetSecret = function () {
  return request(`/${secretApi}`, {
    method: RequestMethod.Get,
  });
};

export const UpdateSecret = function (data: object) {
  return request(`/${secretApi}`, {
    method: RequestMethod.Put,
    data,
  });
};

export const CreateSecret = function () {
  return request(`/${secretApi}`, {
    method: RequestMethod.Post,
  });
};

export const getUsers = function () {
  return request('/api/takin/user/getNames', {
    method: RequestMethod.Get,
  });
};

export const updateSelfBoard = function (data) {
  return request('/api/takin/self/board', {
    method: RequestMethod.Put,
    data,
  });
};
