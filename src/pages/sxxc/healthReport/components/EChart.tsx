import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';

interface EChartProps {
  option: Record<string, any>;
  height?: number | string;
}

/** echarts 轻量封装：负责初始化、option 更新、resize 与销毁 */
const EChart: React.FC<EChartProps> = ({ option, height = 260 }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const chart = echarts.init(containerRef.current);
    chartRef.current = chart;
    const handleResize = () => chart.resize();
    // 数据异步到达后容器高度可能变化（如动态高度的条形图），需同步 resize 画布
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={containerRef} style={{ width: '100%', height }} />;
};

export default EChart;
