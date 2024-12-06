import React, { useEffect, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import { executeApiService } from '@/services/api_service';
import * as echarts from 'echarts';
export default function AssetdistributionStatus(props) {
    const [option, setOption] = useState({});
    const chartRef = useRef(null);
    let isMounted = true;
    let options = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            top:0,
            right:0,
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 20,
        },
        grid: {
            top:'12%',
            left: '1%',
            right: '1%',
            bottom: 0,
            containLabel: true
        },
        xAxis: [
            {
                type: 'category',
                axisLabel: {
                    rotate: 45,
                    fontSize: 12 
                },
                data: []
            }
        ],
        yAxis: [
            {
                type: 'value'
            }
        ],
        series: [
            {
                name: '正常',
                type: 'bar',
                stack: 'Ad',
                barWidth: '10',
                emphasis: {
                    focus: 'series'
                },
                itemStyle: {
                    color: '#5082FF' 
                },
                data: []
            },
            {
                name: '告警',
                type: 'bar',
                barWidth: '10',
                stack: 'Ad',
                emphasis: {
                    focus: 'series'
                },
                itemStyle: {
                    color: '#EC5417' 
                },
                data: []
            },
        ]
    };

    useEffect(() => {
        const controller = new AbortController();
        const getData = (() => {
            executeApiService(4).then((res) => {
                let dataArr = res.dat[0];
                let title = dataArr.map(x => x.metric.name)
                options.xAxis[0].data = [...new Set(title)]
                if (title.length) {
                    title.forEach((element, index) => {
                        let zc = dataArr.find(x => x.metric.name == element && x.metric.type == '正常')
                        let gj = dataArr.find(x => x.metric.name == element && x.metric.type == '告警')
                        options.series[0].data[index] = zc ? Number(zc.metric.value) : '-'
                        options.series[1].data[index] = gj ? Number(gj.metric.value) : '-'
                    });
                }
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
