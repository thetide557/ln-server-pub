import React, { useMemo } from 'react';
import ChartCard from './ChartCard';
import EChart from './EChart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chartTheme';
/** 分配率数据项（label 已带单位，rate 为 0-100 数值） */
export interface AllocationRateDatum {
  label: string;
  rate: number;
}

interface AllocationRateChartProps {
  data: AllocationRateDatum[];
}

/** 分配率越高，条形颜色越亮 */
const rateColor = (value: number) => {
  const weight = 0.35 + Math.min(1, Math.max(0, value / 100)) * 0.65;
  const from = [22, 116, 66];
  const to = [58, 190, 115];
  return `rgb(${from.map((color, index) => Math.round(color + (to[index] - color) * weight)).join(',')})`;
};

/** 各资源池分配率横向条形图 */
const AllocationRateChart: React.FC<AllocationRateChartProps> = ({ data }) => {
  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      grid: { left: 4, right: 62, top: 8, bottom: 26, containLabel: true },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, ...TOOLTIP_STYLE, valueFormatter: (value: number) => `${value}%` },
      xAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { color: CHART_COLORS.splitLine } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 13, formatter: '{value}%' },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((item) => item.label),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 13 },
      },
      series: [
        {
          type: 'bar',
          barWidth: 16,
          barCategoryGap: '40%',
          label: { show: true, position: 'right', color: CHART_COLORS.valueLabel, fontSize: 13, formatter: '{c}%' },
          data: data.map((item) => ({ value: item.rate, itemStyle: { color: rateColor(item.rate), borderRadius: 6 } })),
        },
      ],
    }),
    [data],
  );

  return (
    <ChartCard title='各资源池分配率'>
      <EChart option={option} height={Math.max(320, data.length * 38 + 62)} />
      <div className='rate-legend'>
        <span>低</span>
        <i />
        <span>高</span>
      </div>
    </ChartCard>
  );
};

export default AllocationRateChart;
