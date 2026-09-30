import React, { useMemo } from 'react';
import ChartCard from './ChartCard';
import EChart from './EChart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chartTheme';
import { formatChartNumber } from '../resourceAnalysisData';
import type { ZoneArchUsage } from '../resourceAnalysisData';

interface UsageCompareChartProps {
  title: string;
  unit: string;
  data: ZoneArchUsage[];
  /** 总量柱颜色 */
  totalColor: string;
  /** 已分配柱颜色 */
  allocatedColor: string;
}

/** 总量与已分配对比柱状图（vCPU / 内存） */
const UsageCompareChart: React.FC<UsageCompareChartProps> = ({ title, unit, data, totalColor, allocatedColor }) => {
  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      grid: { left: 4, right: 4, top: 46, bottom: 0, containLabel: true },
      legend: {
        data: ['总量', '已分配'],
        top: 0,
        right: 0,
        icon: 'rect',
        itemWidth: 10,
        itemHeight: 10,
        itemGap: 16,
        textStyle: { color: CHART_COLORS.legendText, fontSize: 11 },
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
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: unit,
        nameTextStyle: { color: CHART_COLORS.axisLabel, fontSize: 11, padding: [0, 0, 4, -28] },
        splitLine: { lineStyle: { color: CHART_COLORS.splitLine } },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 11, formatter: (value: number) => formatChartNumber(value) },
      },
      series: [
        {
          name: '总量',
          type: 'bar',
          barWidth: 16,
          barGap: '45%',
          itemStyle: { color: totalColor },
          label: { show: true, position: 'top', color: CHART_COLORS.valueLabel, fontSize: 10, formatter: (params: any) => formatChartNumber(params.value) },
          data: data.map((item) => item.total),
        },
        {
          name: '已分配',
          type: 'bar',
          barWidth: 16,
          itemStyle: { color: allocatedColor },
          label: { show: true, position: 'top', color: allocatedColor, fontSize: 10, formatter: (params: any) => formatChartNumber(params.value) },
          data: data.map((item) => item.allocated),
        },
      ],
    }),
    [data, unit, totalColor, allocatedColor],
  );

  return (
    <ChartCard title={title}>
      <EChart option={option} height={270} />
    </ChartCard>
  );
};

export default UsageCompareChart;
