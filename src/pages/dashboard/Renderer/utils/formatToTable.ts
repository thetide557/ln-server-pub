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

const formatToTable = (series: any[], rowBy: string[], colBy: string) => {
  let tmpSerise = [];
 
if(series[0].fields?.col){
  tmpSerise = [
    {
        "id": "series_11",
        "name": "状态",
        "metric": {
            "__name__": "max(v)",
            "col": "A",
            "target": "172.22.1.194"
        },
        "fields": {
            "__name__": "max(v)",
            "col": "A",
            "target": "172.22.1.194",
            "refId": "A"
        },
        "stat": 0,
        "value": 0,
        "unit": "",
        "text": "0"
    },
    {
        "id": "series_12",
        "name": "丢包率(%)",
        "metric": {
            "__name__": "max(v)",
            "col": "B",
            "target": "172.22.1.194"
        },
        "fields": {
            "__name__": "max(v)",
            "col": "B",
            "target": "172.22.1.194",
            "refId": "B"
        },
        "stat": 0,
        "value": 0,
        "unit": "",
        "text": "0"
    },
    {
        "id": "series_13",
        "name": "状态",
        "metric": {
            "__name__": "max(v)",
            "col": "A",
            "target": "172.22.1.195"
        },
        "fields": {
            "__name__": "max(v)",
            "col": "A",
            "target": "172.22.1.195",
            "refId": "A"
        },
        "stat": 0,
        "value": 0,
        "unit": "",
        "text": "0"
    },
    {
        "id": "series_14",
        "name": "丢包率(%)",
        "metric": {
            "__name__": "max(v)",
            "col": "B",
            "target": "172.22.1.195"
        },
        "fields": {
            "__name__": "max(v)",
            "col": "B",
            "target": "172.22.1.195",
            "refId": "B"
        },
        "stat": 0,
        "value": 0,
        "unit": "",
        "text": "0"
    },
    {
        "id": "series_15",
        "name": "响应时间(ms)",
        "metric": {
            "__name__": "max(v)",
            "col": "C",
            "target": "172.22.1.194"
        },
        "fields": {
            "__name__": "max(v)",
            "col": "C",
            "target": "172.22.1.194",
            "refId": "C"
        },
        "stat": 23.115636,
        "value": 23.116,
        "unit": "",
        "text": "23.116"
    },
    {
        "id": "series_16",
        "name": "响应时间(ms)",
        "metric": {
            "__name__": "max(v)",
            "col": "C",
            "target": "172.22.1.195"
        },
        "fields": {
            "__name__": "max(v)",
            "col": "C",
            "target": "172.22.1.195",
            "refId": "C"
        },
        "stat": 1.313671,
        "value": 1.314,
        "unit": "",
        "text": "1.314"
    }
] 
}else {
  tmpSerise = series
}
  const rows = _.groupBy(series, (item) => {
    let groupkeys = '';
    _.forEach(rowBy, (key) => {
      groupkeys += item.fields[key];
    });
    return groupkeys;
  });
  
  const newSeries = _.map(rows, (val, key) => {
    const item: any = {
      id: _.uniqueId('series_'),
    };
    _.forEach(rowBy, (key) => {
      item[key] = val?.[0]?.fields?.[key];
    });
    const subGrouped = _.groupBy(val, (item) => {
      return item.fields[colBy];
    });
    _.forEach(subGrouped, (subVal, subKey) => {
      item[subKey] = {
        name: subVal[0].name,
        id: subVal[0].id,
        stat: subVal[0].stat,
        color: subVal[0].color,
        text: subVal[0].text,
      };
    });
    item.groupNames = _.keys(subGrouped);
    return item;
  });
  return newSeries;
};

export default formatToTable;
