import React, { useMemo } from 'react';
import ChartCard from './ChartCard';
import EChart from './EChart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chartTheme';
import { formatChartNumber } from '../resourceAnalysisData';

export interface TenantRankItem {
  label: string;
  value: number;
}

interface TenantRankChartProps {
  title: string;
  unit: string;
  color: string;
  /** 已按指标降序排列的排行数据 */
  items: TenantRankItem[];
}

/** 租户指标排行横向条形图（主机数量 / CPU / 存储量） */
const TenantRankChart: React.FC<TenantRankChartProps> = ({ title, unit, color, items }) => {
  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      grid: { left: 4, right: 58, top: 8, bottom: 24, containLabel: true },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(23, 55, 94, 0.06)' } },
        ...TOOLTIP_STYLE,
        valueFormatter: (value: number) => `${formatChartNumber(value)}${unit}`,
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: CHART_COLORS.splitLine } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 12, formatter: (value: number) => formatChartNumber(value) },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: items.map((item) => item.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 13 },
      },
      series: [
        {
          type: 'bar',
          barWidth: 16,
          barCategoryGap: '40%',
          label: { show: true, position: 'right', color: CHART_COLORS.valueLabel, fontSize: 13, formatter: (params: any) => formatChartNumber(params.value) },
          data: items.map((item) => ({ value: item.value, itemStyle: { color, borderRadius: 6 } })),
        },
      ],
    }),
    [items, unit, color],
  );

  return (
    <ChartCard title={title}>
      <EChart option={option} height={Math.max(240, items.length * 34 + 56)} />
    </ChartCard>
  );
};

export default TenantRankChart;
