// @ts-nocheck

import React, { useRef, useEffect, useState } from 'react';
import _ from 'lodash';
import * as echarts from 'echarts'
import { getWarningChart } from '@/pages/sxxc/screenView/alarmApi';

const AlarmChartLine = function (props: any) {
  const { curWarn } = props;
  const {id, setId} = useState(null)

  // const [chartList, setChartList] = useState([])

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


  // console.log(222, curWarn);
  const chartRef = useRef(null);

  useEffect(() => {
    console.log(curWarn);
    if (curWarn.id) {
      const chartDom = chartRef.current;
      let myChart = echarts.init(chartDom);
      let query = ''
      if (curWarn.rule_replay && curWarn.rule_replay.queries && curWarn.rule_replay.queries.length > 0) {
        query = curWarn.rule_replay.queries[0].prom_ql.replace(/\$asset_id/g, curWarn.asset_id)
      } else {
        query = curWarn.rule_config.queries[0].prom_ql
      }
      const params = {
        query,
        start: curWarn.trigger_time - 1800, // 30分之前
        end: curWarn.trigger_time + 1800, // 30分之后
        step: 15,
      };
      getWarningChart(params, curWarn.datasource_id).then((res2) => {
        let list1 = res2.data.result || [];
        if (list1.length > 10) {
          list1 = list1.slice(0, 10)
        }
        let seriesData = [];
        // 多条数据x轴不统一
        let xList = [];
        let xList1 = []
        list1.forEach((item) => {
          xList1.push(...item.values.map((item2) => item2[0]));
        });
        // console.log("xlist1", xList1);
        // 收集所有时间戳
        let allTimestamps = [...new Set(xList1)];
        allTimestamps = allTimestamps.sort((a, b) => a - b);
        // console.log("allTime", allTimestamps);
        if (list1.length > 0) {
          // x轴
          xList = allTimestamps.map((item) => convertTime(item, "year"));
        }
  
        // 构建统一的时间戳数组
        list1.forEach((item) => {
          item.values = allTimestamps.map((timestamp) => {
            let found = item.values.find((item) => item[0] === timestamp);
            return found ? found : [timestamp, 0];
          });
  
          const data = item.values.map((item2) => Number(item2[1]).toFixed(3));
          // console.log(data);
          seriesData.push({
            // name: `${item.metric.agent_ip}-${item.metric.asset_id}`,
            type: "line",
            smooth: true,
            showSymbol: false,
            data,
          });
        });
        const option = {
          grid: {
            top: '25px',
            left: '3%',
            right: '4%',
            bottom: '2px',
            containLabel: true
          },
          tooltip: {
            trigger: 'axis'
          },
          xAxis: {
            type: "category",
            // boundaryGap: true,
            data: xList,
            axisLine: {
              lineStyle: {
                color: "#7399A1",
              },
            },
            axisLabel: {
              fontSize: 12,
              formatter: (params) => {
                let timeStr = params.slice(11, 16);
                return timeStr
              }
            },
          },
          yAxis: [
            {
              name: "",
              type: "value",
              // boundaryGap: [0, "100%"],
              axisLine: {
                lineStyle: {
                  color: "#7399A1",
                },
              },
              splitLine: {
                lineStyle: {
                  color: "rgba(115,153,161,0.2)",
                },
              },
              axisLabel: {
                fontSize: 12,
                width: 110, //将内容的宽度固定
                overflow: "truncate", //超出的部分截断
                truncate: "...", //截断的部分用...代替
              },
              minInterval: 1,
              // min: 0,
              // max: 9999999,
              // boundaryGap: ['20%', '20%']
            },
          ],
          series: seriesData,
        };
        console.log(option);

        myChart.setOption(option);
        window.addEventListener("resize", () => {
          myChart.resize();
        });

      });
    }

    // 清理函数，组件卸载时调用
    return () => {
      myChart.dispose();
    };
  }, []);



  return (
    <div style={{ marginTop: '5px' }}>
      <div ref={chartRef} style={{ width: '780px', height: '170px' }}></div>
    </div>
  );
};

export default AlarmChartLine;
