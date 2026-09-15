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
import React, { useState, useEffect, useRef } from 'react';
import _ from 'lodash';
import { useDebounceFn } from 'ahooks';
import { IRawTimeRange } from '@/components/TimeRangePicker';
import { ITarget } from '../../types';
import { getVaraiableSelected } from '../../VariableConfig/constant';
import { IVariable } from '../../VariableConfig/definition';
import replaceExpressionBracket from '../utils/replaceExpressionBracket';
import { getSerieName } from './utils';
import prometheusQuery from './prometheus';
import elasticsearchQuery from './elasticsearch';
// @ts-ignore
import plusDatasource from 'plus:/parcels/Dashboard/datasource';
import apiServicequery from './apiservice';
// ---- 第六步 L3（多数据源）：三行只加的 import，走直达路径不 import 裸目录（拍板-02）。
// fe 走的是 `import { datasource as iotdbQuery } from '@/plugins/iotdb'`
// （fe src/pages/dashboard/Renderer/datasource/useQuery.tsx:23-25），那是裸目录，会把 AlertRule / Explorer 带进来。
import iotdbQuery from '@/plugins/iotdb/Dashboard/datasource';
import tdengineQuery from '@/plugins/TDengine/Dashboard/datasource';
import ckQuery from '@/plugins/clickHouse/Dashboard/datasource';
// ---- 第六步 B1（多数据源补搬轮）：doris 一行，写法同上。开源 fe v9.1.0 的 useQuery.tsx 里没有 doris
// （doris 落在 plus:/parcels/Dashboard/datasource），这条是用户拍板要补的，照 ck 的写法加。
import dorisQuery from '@/plugins/doris/Dashboard/datasource';

interface IProps {
  id?: string;
  dashboardId: string;
  datasourceCate: string;
  datasourceValue?: number;
  time: IRawTimeRange;
  targets: ITarget[];
  variableConfig?: IVariable[];
  inViewPort?: boolean;
  spanNulls?: boolean;
  scopedVars?: any;
}

export default function useQuery(props: IProps) {
  const { dashboardId, datasourceCate, time, targets, variableConfig, inViewPort, spanNulls, datasourceValue } = props;
  const [series, setSeries] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const cachedVariableValues = _.map(variableConfig, (item) => {
    return getVaraiableSelected(item.name, item.type, dashboardId);
  });
  const flag = useRef(false);
  const fetchQueryMap = {
    prometheus: prometheusQuery,
    elasticsearch: elasticsearchQuery,
    api: apiServicequery,
    // ---- 第六步 L3（多数据源）：三条只加的 map 项，key 就是守卫，对现有类型恒假。
    // fe 的 plugins/<t>/Dashboard/datasource 返回的是 { series, query } 对象（fe 同文件 :77 解构了它），
    // 而 pub 这里的 .then((res: any[]) => setSeries(res)) 期望的是数组，所以每条都用 .then 取出 series
    // （顾问意见 X-6 (b)）。query 是给「查询详情」面板看的，pub 没有那个面板，丢掉。
    iotdb: (p) => iotdbQuery(p).then((r: any) => r.series),
    tdengine: (p) => tdengineQuery(p).then((r: any) => r.series),
    ck: (p) => ckQuery(p).then((r: any) => r.series),
    doris: (p) => dorisQuery(p).then((r: any) => r.series), // 第六步 B1：同上，用户拍板要补
    ...plusDatasource,
  };
  const { run: fetchData } = useDebounceFn(
    () => {
      if (!datasourceCate) return;
      setLoading(true);
      fetchQueryMap[datasourceCate](props)
        .then((res: any[]) => {
          setSeries(res);
          setError('');
        })
        .catch((e) => {
          setSeries([]);
          setError(e.message);
        })
        .finally(() => {
          setLoading(false);
        });
    },
    {
      wait: 500,
    },
  );

  useEffect(() => {
    // 配置变化时且图表在可视区域内重新请求数据，同时重置 flag
    if (inViewPort) {
      fetchData();
    } else {
      flag.current = false;
    }
  }, [JSON.stringify(targets), JSON.stringify(time), JSON.stringify(variableConfig), JSON.stringify(cachedVariableValues), spanNulls, datasourceValue]);

  useEffect(() => {
    // 如果图表在可视区域内并且没有请求过数据，则请求数据
    if (inViewPort && !flag.current) {
      flag.current = true;
      fetchData();
    }
  }, [inViewPort]);

  useEffect(() => {
    // 目前只有 prometheus 支持 legend 替换
    const _series = _.map(series, (item) => {
      const target = _.find(targets, (t) => t.expr === item.expr);
      return {
        ...item,
        name: target?.legend ? replaceExpressionBracket(target?.legend, item.metric) : getSerieName(item.metric),
      };
    });
    setSeries(_series);
  }, [JSON.stringify(_.map(targets, 'legend'))]);

  return { series, error, loading };
}
