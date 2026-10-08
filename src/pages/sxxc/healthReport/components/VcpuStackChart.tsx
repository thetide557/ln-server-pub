import React, { useMemo } from 'react';
import ChartCard from './ChartCard';
import EChart from './EChart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chartTheme';
import { formatChartNumber } from '../resourceAnalysisData';
import type { ZoneArchUsage } from '../resourceAnalysisData';

interface VcpuStackChartProps {
  title: string;
  unit: string;
  data: ZoneArchUsage[];
  /** 已分配柱颜色（底部） */
  allocatedColor: string;
  /** 剩余柱颜色（顶部） */
  restColor: string;
}

/** 已分配 / 剩余 堆叠柱状图 */
const VcpuStackChart: React.FC<VcpuStackChartProps> = ({ title, unit, data, allocatedColor, restColor }) => {
  const option = useMemo(() => {
    const rest = data.map((item) => Math.round((item.total - item.allocated) * 100) / 100);
    return {
      backgroundColor: 'transparent',
      grid: { left: 4, right: 4, top: 46, bottom: 0, containLabel: true },
      legend: {
        data: ['已分配', '剩余'],
        top: 0,
        right: 0,
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: CHART_COLORS.legendText, fontSize: 13 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(23, 55, 94, 0.06)' } },
        ...TOOLTIP_STYLE,
        valueFormatter: (value: number) => `${formatChartNumber(value)}${unit}`,
      },
      xAxis: {
        type: 'category',
        data: data.map((item) => item.label),
        axisLine: { lineStyle: { color: CHART_COLORS.axisLine } },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 13 },
      },
      yAxis: {
        type: 'value',
        name: unit,
        nameTextStyle: { color: CHART_COLORS.axisLabel, fontSize: 13, padding: [0, 0, 4, -28] },
        splitLine: { lineStyle: { color: CHART_COLORS.splitLine } },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 13, formatter: (value: number) => formatChartNumber(value) },
      },
      series: [
        {
          name: '已分配',
          type: 'bar',
          stack: 'quota',
          barWidth: 24,
          itemStyle: { color: allocatedColor },
          label: { show: true, position: 'inside', color: '#ffffff', fontSize: 12, formatter: (params: any) => formatChartNumber(params.value) },
          data: data.map((item) => item.allocated),
        },
        {
          name: '剩余',
          type: 'bar',
          stack: 'quota',
          barWidth: 24,
          itemStyle: { color: restColor },
          label: { show: true, position: 'inside', color: '#3d5270', fontSize: 12, formatter: (params: any) => formatChartNumber(params.value) },
          data: rest,
        },
      ],
    };
  }, [data, unit, allocatedColor, restColor]);

  return (
    <ChartCard title={title} className="chart-fill-height">
      <EChart option={option} height={270} />
    </ChartCard>
  );
};

export default VcpuStackChart;
