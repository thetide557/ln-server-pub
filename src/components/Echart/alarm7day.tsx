import React, { useEffect, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import * as echarts from 'echarts'
import { executeApiService } from '@/services/api_service';
export default function Alarm7day(props) {
    const [option, setOption] = useState({});
    const [allNum, setAllNum] = useState(0);
    const chartRef = useRef(null);
    let isMounted = true;
    let options = {
        grid: {
            left: '7%',
            right: '5%',
            top: '15%',
            bottom: '10%',
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: []
        },
        yAxis: {
            name: '(次数)',
            type: 'value',
            axisLabel: {
                fontSize: 11
            },
        },
        series: [
            {
                data: [],
                type: 'line',
                smooth: true,
            }
        ]
    };

    useEffect(() => {
        const controller = new AbortController();
        const getData = (() => {
            executeApiService(props.id).then((res) => {
                let allNum = 0;
                res.dat[0].forEach(element => {
                    allNum += Number(element.metric.value)
                    options.xAxis.data.push(getStringAfterFirst(element.metric.name, '-'))
                    options.series[0].data.push(Number(element.metric.value))
                });
                if (isMounted) {
                    setOption(options)
                    setAllNum(allNum)
                    updateChart(options);
                }

            });
        })
        const getStringAfterFirst = (str, char) => {
            var indexs = str.indexOf(char)
            return str.substring(indexs + 1, str.length);
        }
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
        <div className='box' style={{ position: 'relative' }}>
            <div className='allNum' style={{ position: 'absolute', top: '-12%', right: '7%', fontSize: '16px', fontWeight: '500' }}>告警总数<span style={{
                color: '#4D83FF', fontSize: '18px',
                fontWeight: 'bolder'
            }}> {allNum} </span>次</div>
            <ReactEcharts ref={chartRef} notMerge={true} option={option} style={{ width: '100%', height: '22vh', margin: ' 0 auto' }}></ReactEcharts>
        </div>
    )
}
