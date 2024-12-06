import React, { useEffect, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import { fetchHistoryRangeBatch } from '@/services/api_service';
import { parseRange } from '@/components/TimeRangePicker';
import moment from 'moment';
import * as echarts from 'echarts';
import { executeApiService } from '@/services/api_service';
export default function NetworkNodePing() {
    const [option, setOption] = useState({});
    const chartRef = useRef(null);
    let isMounted = true;
    let options = {
        grid: {
            top: '5%',
            left: '3%',
            right: '3%',
            bottom: '3%',
            containLabel: true
        },
        toolbox: {
            show: false,
        },
        tooltip: {
            showDelay: 0,
            formatter: function (params) {
                if (params.value.length > 1) {
                    return (
                        `<div style="text-align:left;">${moment(params.value[0]).format('YYYY-MM-DD HH:mm:ss')}</div>
                        <div>
                            <span>${params.seriesName} </span>
                            <span> 网络端点-响应时间 </span>
                            <span style="color:${params.color}"> ${params.value[1]}</span>`
                    );
                }
            },
            axisPointer: {
                show: true,
                type: 'cross',
                lineStyle: {
                    type: 'dashed',
                    width: 1
                }
            }
        },
        brush: {},
        legend: {
            data: [],
            left: 'center',
            top: '1%',
            icon: 'circle',
        },
        color:['#FF443D','#EE752A','#FFA662','#97BB6E'],
        xAxis: [
            {
                type: 'time',
                scale: true,
                splitLine: {
                    show: false
                }
            }
        ],
        yAxis: [
            {
                type: 'value',
                scale: true,
                splitLine: {
                    show: false
                }
            }
        ],
        series: []
    };

    useEffect(() => {
        const controller = new AbortController();
        const getData = (() => {
            const parsedRange = parseRange({ end: "now", start: "now-1h" });
            let start = moment(parsedRange.start).unix();
            let end = moment(parsedRange.end).unix();
            fetchHistoryRangeBatch({
                datasource_id: 1, queries: [{ start, end, query: "topk(10,ping_average_response_ms)", step: 15 }]
            }, { signal: '7b62876a-279a-4b45-a4f5-0bd4873f4e81-topk(10,ping_average_response_ms)' }).then((res) => {
                res.dat[0].forEach(element => {
                    options.legend.data.push(element.metric.asset_name)
                    options.series.push({
                        name: element.metric.asset_name,
                        type: 'scatter',
                        emphasis: {
                            focus: 'series'
                        },
                        data: element.values.map(x => { return [Number(x[0]) * 1000, x[1]] })
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
            <ReactEcharts ref={chartRef} notMerge={true} option={option} style={{ width: '100%', height: '22vh', margin: ' 0 auto' }}></ReactEcharts>
        </div>
    )
}
