import React, { useEffect, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import { fetchHistoryInstantBatch } from '@/services/api_service';
import * as echarts from 'echarts'
import { parseRange } from '@/components/TimeRangePicker';
import moment from 'moment';
export default function StoreTop10() {
    const [option, setOption] = useState({});
    const chartRef = useRef(null);
    let isMounted = true;
    let options = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow',
                lineStyle: {
                    color: '#4D83FF'
                }
            },
            valueFormatter: function (value) {
                return value + ' %'
            }
        },
        legend: {},
        grid: {
            top: '1%',
            left: '0',
            right: '3%',
            bottom: '0',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            position: 'top',
            axisLabel: {
                formatter: function (value, index) {
                    return value + '%';
                }
            }
        },
        yAxis: {
            type: 'category',
            data: []
        },
        series: [
            {
                name: '',
                type: 'bar',
                barWidth: '10',
                itemStyle: {
                    borderRadius: [0, 5, 5, 0],
                    color: new echarts.graphic.LinearGradient(
                        0, 0, 1, 1,
                        [
                            { offset: 0, color: '#CADAFF' },
                            { offset: 1, color: '#E12A2C' }
                        ]
                    )
                },
                data: []
            },
        ]
    };

    useEffect(() => {
        const controller = new AbortController();
        const getData = (() => {
            const parsedRange = parseRange({ end: "now", start: "now-1h" });
            let start = moment(parsedRange.start).unix();
            fetchHistoryInstantBatch({
                datasource_id: 1, queries: [{ time: start, query: "topk(10,mem_available_percent)" }]
            }, 22).then((res) => {
                res.dat[0].forEach(element => {
                    options.yAxis.data.push(element.metric.asset_name)
                    options.series[0].data.push(Number(element.value[1]).toFixed(3))
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
