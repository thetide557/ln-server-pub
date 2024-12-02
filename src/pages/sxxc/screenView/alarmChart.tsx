// @ts-nocheck

import React, { useRef, useEffect } from 'react';
import _ from 'lodash';
import { Line } from '@ant-design/plots';

const AlarmChart = function (props: any) {
  const { chartList } = props;

    // 时间戳转换时间
    const convertTime = (timestamp, type) => {
      const date = new Date(parseInt(timestamp) * 1000);
      const Year = date.getFullYear();
      const Moth =
        date.getMonth() + 1 < 10
          ? "0" + (date.getMonth() + 1)
          : date.getMonth() + 1;
      const Day = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
      const Hour =
        date.getHours() < 10 ? "0" + date.getHours() : date.getHours();
      const Minute =
        date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes();
      const Sechond =
        date.getSeconds() < 10 ? "0" + date.getSeconds() : date.getSeconds();
      if (type == "year") {
        return `${Year}-${Moth}-${Day} ${Hour}:${Minute}:${Sechond}`;
      } else {
        return `${Hour}:${Minute}`;
      }
    }

  let list1 = _.cloneDeep(chartList)
  // console.log(list1);
  let seriesData = []
  let xList = [];
  if (list1.length > 1) {
    list1 = [list1[0]]
    list1[0].values.forEach((item) => {
      // console.log(data);
      seriesData.push({
        date: convertTime(item[0], 'time'),
        value: Number(item[1]).toFixed(2)
      });
    });
  }
  console.log(111, list1);
  

  console.log('323', seriesData);

  // const legend = this.chartList.map((item) => {
  //   return `${item.metric.agent_ip}-${item.metric.asset_id}`;
  // });
  // console.log(legend);
  if (list1.length > 0) {
    xList = list1[0].values;
  }

  const config = {
    data: seriesData,
    xField: 'date', // X轴数据字段
    yField: 'value', // Y轴数据字段
    // title: {
    //   text: '月度销售数据',
    // },
    tooltip: {
      showMarkers: false,
    },
    // 可以添加更多配置选项，如legend、xAxis、yAxis等
    yAxis: {
      tickCount: 4,
      tickStroke: '#ddd'
    },
  };



  return (
    <div style={{marginTop: '5px'}}>
      <Line {...config} style={{width: '780px', height: '170px'}} />
    </div>
  );
};

export default AlarmChart;
