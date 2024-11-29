import React, { useEffect, useRef, useState } from 'react'
import ReactEcharts from 'echarts-for-react'
import { executeApiService } from '@/services/api_service';
import * as echarts from 'echarts';
export default function RingGraph(props) {
    const [option, setOption] = useState({});
    const chartRef = useRef(null);
    let isMounted = true;
    let options = {
        grid: {
            bottom: '30%'
        },
        tooltip: {
            trigger: "item",
            formatter: function (params) {
                let result = "";
                return result = `<div style="text-align:left"><label style="display: inline-block;width:80px;">${params.name}</label><label style="display: inline-block;width:80px;text-align:right;color:#1539E1;font-weight:600">${Number(params.value).toFixed(0)}个</label></div><div style="text-align:left"><label style="display: inline-block;width:80px;">占比</label><lable style="display: inline-block;width:80px;text-align:right;color:#1539E1;font-weight:600">${params.percent}%</lable></div>`
            },
        },
        legend: {
            autoWrap: true,
            height: '80%',
            orient: 'vertical',
            top: "20%",
            x: '60%',
            bottom: '50'
        },
        graphic: {
            elements: [
                {
                    type: "group",
                    left: "30%",
                    bottom: "center",
                    bounding: "raw",
                    children: [
                        {
                            type: "text",
                            left: 'center',
                            top: -20,
                            style: {
                                text: 0,
                                textAlign: "center",
                                fill: "#4D83FF",
                                fontSize: 32,
                                fontWeight: " bolder",
                                lineHeight: 20,
                            },
                        },
                        {
                            type: "text",
                            left: 'center',
                            top: 15,
                            style: {
                                text: `总计 `,
                                textAlign: "center",
                                fill: "#1A1A1A",
                                fontSize: 16,
                                lineHeight: 20,
                            },
                        },
                    ],
                },
            ],
        },
        series: [
            {
                name: "",
                type: "pie",
                radius: ["60%", "90%"],
                center: ['30%', '50%'],
                avoidLabelOverlap: false,
                label: {
                    show: false,
                    position: "center",
                },
                emphasis: {
                    label: {
                        show: false,
                        fontSize: 40,
                        fontWeight: "bold",
                    },
                },
                labelLine: {
                    show: false,
                },
                data: [],
                // data: [
                //     { value: 1048, name: 'Search Engine' },
                //     { value: 735, name: 'Direct' },
                //     { value: 580, name: 'Email' },
                //     { value: 484, name: 'Union Ads' },
                //     { value: 300, name: 'Video Ads' },
                //     { value: 1048, name: 'aaa' },
                //     { value: 735, name: 'sss' },
                //     { value: 580, name: 'ddd' },
                //     { value: 484, name: 'fff' },
                //     { value: 1048, name: 'rffd' },
                //     { value: 735, name: 'dfgfnf' },
                //     { value: 580, name: 'tr' },
                //     { value: 484, name: 'rttjt' },
                //     { value: 484, name: 'ertew' },
                //     { value: 1048, name: 'rrgreffd' },
                //     { value: 735, name: 'reh' },
                //     { value: 580, name: 'hrt' },
                //     { value: 484, name: 'rtyjrtj' },
                // ]
            },
        ],
    };

    useEffect(() => {
        const controller = new AbortController();
        const getData = (() => {
            executeApiService(props.id).then((res) => {
                let assetHealthTotal = 0;
                let datas = res.dat[0].map((element) => {
                    assetHealthTotal += Number(element.metric.value);
                    return {
                        value: element.metric.value,
                        name: element.metric.name,
                    };
                });
                options.graphic.elements[0].children[0].style.text = assetHealthTotal
                options.series[0].data = datas
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
