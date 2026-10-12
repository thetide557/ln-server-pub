import React, { forwardRef, useMemo } from 'react';
import AllocationProgressPanel from './AllocationProgressPanel';
import AllocationRateChart from './AllocationRateChart';
import ChartCard from './ChartCard';
import DetailTable from './DetailTable';
import UnitCards from './UnitCards';
import UsageCompareChart from './UsageCompareChart';
import VcpuStackChart from './VcpuStackChart';
import TenantRankChart from './TenantRankChart';
import TenantCompareChart from './TenantCompareChart';
import {
  buildOverview,
  calcAllocationProgress,
  calcAllocationRates,
  calcDetailRows,
  calcTenantUsage,
  calcUnitCards,
  calcZoneArchUsage,
} from '../resourceAnalysisData';
import type { CloudUnit } from '../resourceAnalysisData';

/** 指标卡数值配色，浅底上保证对比度 */
const METRIC_COLORS = ['#12b3a6', '#22b35c', '#1668dc', '#7e4ce0', '#d9822b'];
/** 对比柱状图配色：总量 / 已分配 */
const CPU_COLORS = { total: '#1668dc', allocated: '#3ba0f5', rest: '#a9d3f7' };
const MEM_COLORS = { total: '#5b3fa8', allocated: '#8a63e0', rest: '#c7b6f5' };
/** 租户排行 / 三维对比配色：主机（绿）/ CPU（蓝）/ 存储（紫） */
const TENANT_COLORS = { hosts: '#22b35c', cpu: '#3ba0f5', storage: '#8a63e0' };

interface ReportBodyProps {
  units: CloudUnit[];
  /** 检索栏当前选中值摘要，用于在报告顶部展示筛选条件 */
  filterSummary?: { label: string; value: string }[];
  /** 导出模式：明细表去掉 rowSpan，避免 PDF 切片换页后文字缺失 */
  flat?: boolean;
}

/**
 * 资源分析报告正文（筛选条件摘要 + 核心指标概览 + 资源使用情况 + 明细表 + 单位明细）。
 * 页面展示与 PDF 导出共用同一份渲染结果，保证「所见即所导」。
 */
const ReportBody = forwardRef<HTMLDivElement, ReportBodyProps>(({ units, filterSummary, flat = false }, ref) => {
  const overview = useMemo(() => buildOverview(units), [units]);
  const cpuUsage = useMemo(() => calcZoneArchUsage(units, 'cpu'), [units]);
  const memUsage = useMemo(() => calcZoneArchUsage(units, 'mem'), [units]);
  const allocationRates = useMemo(() => calcAllocationRates(units), [units]);
  const allocationProgress = useMemo(() => calcAllocationProgress(units), [units]);
  const detailRows = useMemo(() => calcDetailRows(units), [units]);
  const unitCards = useMemo(() => calcUnitCards(units), [units]);
  const tenantUsage = useMemo(() => calcTenantUsage(units), [units]);

  /** 三张排行图各自按本指标降序 */
  const hostRank = useMemo(
    () => tenantUsage.map((item) => ({ label: item.label, value: item.hosts })).sort((a, b) => b.value - a.value),
    [tenantUsage],
  );
  const cpuRank = useMemo(
    () => tenantUsage.map((item) => ({ label: item.label, value: Math.round(item.cpuAllocated) })).sort((a, b) => b.value - a.value),
    [tenantUsage],
  );
  const storageRank = useMemo(
    () => tenantUsage.map((item) => ({ label: item.label, value: item.storageGB })).sort((a, b) => b.value - a.value),
    [tenantUsage],
  );

  const metrics = [
    { key: 'unit', label: '上云单位', value: overview.unitCount, unit: '户', note: `含商用 ${overview.commercialUnitCount} 户` },
    {
      key: 'server',
      label: '云服务器',
      value: overview.serverCount,
      unit: '台',
      note: overview.serverByCharge.map((item) => `${item.chargeType}${item.count}`).join(' / '),
    },
    { key: 'cpu', label: 'vCPU配额', value: overview.cpuTotal, unit: '核', note: `分配率 ${overview.cpuAllocRate}%` },
    { key: 'storage', label: '存储容量', value: overview.storageTotalGB, unit: 'GB', note: `约 ${overview.storageTotalTB} TB` },
    { key: 'system', label: '业务系统', value: overview.systemCount, unit: '个', note: '已部署上线' },
  ];

  return (
    <div className="report-body" ref={ref}>
      {filterSummary && filterSummary.length > 0 && (
        <div className="report-filters-summary">
          {filterSummary.map((item) => (
            <div className="report-filters-summary-item" key={item.label}>
              <span className="report-filters-summary-label">{item.label}</span>
              <span className="report-filters-summary-value">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      <section className="resource-analysis-overview">
        <h2 className="overview-title">核心指标概览</h2>
        <div className="overview-cards">
          {metrics.map((metric, index) => (
            <div className="overview-card" key={metric.key}>
              <div className="overview-card-label">{metric.label}</div>
              <div className="overview-card-value" style={{ color: METRIC_COLORS[index] }}>
                {metric.value.toLocaleString('en-US')}
                <small>{metric.unit}</small>
              </div>
              <div className="overview-card-note">{metric.note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="report-section">
        <h2 className="section-title">资源使用情况</h2>
        <div className="chart-grid chart-grid--2">
          <UsageCompareChart title="vCPU 总量与已分配对比" unit="核" data={cpuUsage} totalColor={CPU_COLORS.total} allocatedColor={CPU_COLORS.allocated} />
          <UsageCompareChart title="内存总量与已分配对比" unit="GB" data={memUsage} totalColor={MEM_COLORS.total} allocatedColor={MEM_COLORS.allocated} />
        </div>
        <div className="chart-grid chart-grid--1">
          <AllocationRateChart data={allocationRates} />
        </div>
        <div className="chart-grid chart-grid--2">
          <VcpuStackChart title="vCPU 堆叠分布（已分配 / 剩余）" unit="核" data={cpuUsage} allocatedColor={CPU_COLORS.allocated} restColor={CPU_COLORS.rest} />
          <AllocationProgressPanel title="存储分配进度" data={allocationProgress} />
        </div>
        <div className="chart-grid chart-grid--3">
          <TenantRankChart title="各租户主机数量" unit="台" color={TENANT_COLORS.hosts} items={hostRank} />
          <TenantRankChart title="各租户 CPU 配额" unit="核" color={TENANT_COLORS.cpu} items={cpuRank} />
          <TenantRankChart title="各租户存储量" unit="GB" color={TENANT_COLORS.storage} items={storageRank} />
        </div>
        <div className="chart-grid chart-grid--1">
          <TenantCompareChart data={tenantUsage} />
        </div>
      </section>

      <section className="report-section">
        <h2 className="section-title">资源使用情况明细表（含云外部署）</h2>
        <ChartCard title="资源使用情况明细">
          <DetailTable rows={detailRows} flat={flat} />
        </ChartCard>
      </section>

      <section className="report-section">
        <h2 className="section-title">上云单位资源明细</h2>
        <UnitCards data={unitCards} />
      </section>
    </div>
  );
});

ReportBody.displayName = 'ReportBody';

export default ReportBody;
