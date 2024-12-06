import React, { useEffect, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import { fetchHistoryRangeBatch } from '@/services/api_service';
import { parseRange } from '@/components/TimeRangePicker';
import moment from 'moment';
import _ from 'lodash';
import * as echarts from 'echarts';
export default function ServiceTcp() {
    const [option, setOption] = useState({});
    const chartRef = useRef(null);
    let isMounted = true;
    let options = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                if (params.length >= 1) {
                    let dom = `<div style="text-align:left;">${params[0].axisValueLabel}</div>`
                    params.forEach(element => {
                        dom += `<div><span style="display: inline-block;width:100px;text-algin:left;">${element.seriesName} </span><span>网络端点-响应时间</span><span style="color:${element.color}">&nbsp;&nbsp;${element.value[1]}</span></div>`
                    })
                    return dom;
                }
            },
        },
        color:['#FF443D','#EE752A','#FFA662','#97BB6E'],
        legend: {
            icon: 'circle',
            data: []
        },
        grid: {
            top: '15%',
            left: '3%',
            right: '4%',
            bottom: '1%',
            containLabel: true
        },
        toolbox: {
            feature: {
                saveAsImage: {}
            }
        },
        xAxis: {
            type: 'time',
            boundaryGap: false,
            data: []
        },
        yAxis: {
            type: 'value'
        },
        series: []
    };

    useEffect(() => {
        const controller = new AbortController();
        const getData = (() => {
            const parsedRange = parseRange({ end: "now", start: "now-1h" });
            let start = moment(parsedRange.start).unix();
            let end = moment(parsedRange.end).unix();
            fetchHistoryRangeBatch({
                queries: [{ end: end, start: start, query: "netstat_tcp_tw", step: 15 }], datasource_id: 1
            }).then((res) => {
                options.xAxis.data = res.dat[0][0].values.map(x => x[0] * 1000)
                res.dat[0].forEach(element => {
                    options.legend.data.push(element.metric.agent_ip)
                    options.series.push({
                        name: element.metric.agent_ip,
                        type: 'line',
                        smooth: true,
                        showSymbol: false,
                        data: element.values.map(x => [x[0] * 1000, x[1]])
                    })
                });
                if (isMounted) {
                    setOption(options)
                    updateChart(options);
                }
            }).catch(error => {
                console.error('Fetch error:', error);
            });
        })
        getData();
        return () => {
            isMounted = false;
            controller.abort();
            if (chartRef.current) {
                echarts.dispose(chartRef.current);
            }
        };
    }, []);
    const updateChart = (option) => {
        if (chartRef.current) {
            const myChart = echarts.getInstanceByDom(chartRef.current);
            if (myChart) {
                myChart.setOption(option);
            }
        }
    };
    return (
        <div className='box'>
            <ReactEcharts ref={chartRef} option={option} style={{ width: '100%', height: '22vh', margin: ' 0 auto' }}></ReactEcharts>
        </div>
    )
}
