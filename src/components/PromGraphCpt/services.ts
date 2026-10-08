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
import _ from 'lodash';
import request from '@/utils/request';
import { RequestMethod } from '@/store/common';

// N36 批 E：第三个参数 `signal` 是为 AI 查询停靠栏加的，逐字同上游
// （`git -C /home/mcpops/Programs/nightingale-AI-About/fe show ee48e701:src/components/PromGraphCpt/services.ts:20`）。
// 它是可选的，另一个调用方 `src/pages/assetmgt/Graph.tsx:27` 不传、行为不变。
// 为什么要它：停靠栏换一条查询时要把上一条还在路上的请求掐掉，不然慢请求会白跑完
// （正确性本来就有保障——`usePendingQuery` 的 complete 一旦结了就不再应答）。
export const getPromData = (url: string, params, signal?: AbortSignal) => {
  return request(url, {
    method: RequestMethod.Get,
    params,
    silence: true,
    signal,
  }).then((res) => res.data);
};

export const setTmpChartData = function (data: { configs: string }[]) {
  return request(`/api/n9e/share-charts`, {
    method: RequestMethod.Post,
    data,
  });
};
