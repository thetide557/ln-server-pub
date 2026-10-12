import React, { useMemo } from 'react';
import ChartCard from './ChartCard';
import EChart from './EChart';
import { CHART_COLORS, TOOLTIP_STYLE } from './chartTheme';
import { formatChartNumber } from '../resourceAnalysisData';
/** 三维对比数据项（已按主机数降序） */
export interface TenantCompareDatum {
  label: string;
  hosts: number;
  cpu: number;
  storageGB: number;
}

interface TenantCompareChartProps {
  data: TenantCompareDatum[];
}

/** 三个系列的配色：主机（绿）/ CPU（蓝）/ 存储（紫） */
const SERIES_COLORS = { hosts: '#22b35c', cpu: '#3ba0f5', storage: '#8a63e0' };
const SERIES_NAMES = { hosts: '主机数(台)', cpu: 'CPU(核)', storage: '存储(×100GB)' } as const;

/** 存储量级远大于主机/CPU，同轴展示时按 ×100GB 缩放，截断两位小数（不四舍五入） */
const STORAGE_SCALE = 100;

/** 截断到小数点后两位（不四舍五入） */
const truncate2 = (value: number) => Math.floor(value * 100) / 100;

/** 租户资源三维对比：主机 / CPU / 存储(×100GB) 分组横向条形图 */
const TenantCompareChart: React.FC<TenantCompareChartProps> = ({ data }) => {
  const option = useMemo(
    () => ({
      backgroundColor: 'transparent',
      grid: { left: 4, right: 24, top: 44, bottom: 26, containLabel: true },
      legend: {
        data: [SERIES_NAMES.hosts, SERIES_NAMES.cpu, SERIES_NAMES.storage],
        top: 4,
        icon: 'rect',
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 24,
        textStyle: { color: CHART_COLORS.legendText, fontSize: 14 },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(23, 55, 94, 0.06)' } },
        ...TOOLTIP_STYLE,
        // 存储系列在轴上做了 ÷100 缩放，tooltip 还原为真实 GB
        formatter: (params: any[]) => {
          const lines = [`<div style="margin-bottom:4px">${params[0]?.name ?? ''}</div>`];
          params.forEach((param) => {
            const isStorage = param.seriesName === SERIES_NAMES.storage;
            if (isStorage) {
              const rawGB = Math.round((param.value as number) * STORAGE_SCALE);
              lines.push(`${param.marker}${param.seriesName}：<b>${formatChartNumber(rawGB)}</b> GB`);
            } else {
              const unit = param.seriesName.includes('CPU') ? '核' : '台';
              lines.push(`${param.marker}${param.seriesName}：<b>${formatChartNumber(param.value as number)}</b> ${unit}`);
            }
          });
          return lines.join('<br/>');
        },
      },
      xAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: CHART_COLORS.splitLine } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: CHART_COLORS.axisLabel, fontSize: 13, formatter: (value: number) => formatChartNumber(value) },
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
          name: SERIES_NAMES.hosts,
          type: 'bar',
          barWidth: 9,
          barCategoryGap: '35%',
          itemStyle: { color: SERIES_COLORS.hosts, borderRadius: 3 },
          data: data.map((item) => item.hosts),
        },
        {
          name: SERIES_NAMES.cpu,
          type: 'bar',
          barWidth: 9,
          itemStyle: { color: SERIES_COLORS.cpu, borderRadius: 3 },
          data: data.map((item) => Math.round(item.cpu)),
        },
        {
          name: SERIES_NAMES.storage,
          type: 'bar',
          barWidth: 9,
          itemStyle: { color: SERIES_COLORS.storage, borderRadius: 3 },
          data: data.map((item) => truncate2(item.storageGB / STORAGE_SCALE)),
        },
      ],
    }),
    [data],
  );

  return (
    <ChartCard title='租户资源三维对比（主机 / CPU / 存储）'>
      <EChart option={option} height={Math.max(280, data.length * 36 + 78)} />
    </ChartCard>
  );
};

export default TenantCompareChart;
