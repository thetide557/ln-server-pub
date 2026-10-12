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
import { parseRate } from '../resourceAnalysisData';
import type { ReportData } from '../resourceAnalysisData';

/** 指标卡数值配色，浅底上保证对比度 */
const METRIC_COLORS = ['#12b3a6', '#22b35c', '#1668dc', '#7e4ce0', '#d9822b'];
/** 对比 / 堆叠柱状图配色：总量 / 已分配 / 剩余 */
const COMPARE_COLORS = { total: '#1668dc', allocated: '#3ba0f5', rest: '#a9d3f7' };
/** 存储分配进度配色（标存 / SSD / 对象存） */
const STORAGE_POOL_COLORS = ['#1668dc', '#5b3fa8', '#0e8f82'];
const STORAGE_POOL_KEYS = ['standardStorage', 'ssd', 'objectStorage'];
/** 租户排行 / 三维对比配色：主机（绿）/ CPU（蓝）/ 存储（紫） */
const TENANT_COLORS = { hosts: '#22b35c', cpu: '#3ba0f5', storage: '#8a63e0' };

interface ReportBodyProps extends ReportData {
  /** 检索栏当前选中值摘要，用于在报告顶部展示筛选条件 */
  filterSummary?: { label: string; value: string }[];
}

/**
 * 资源分析报告正文（筛选条件摘要 + 核心指标概览 + 资源使用情况 + 明细表 + 单位明细）。
 * 数据全部来自 /biz/analysis 预聚合接口，页面展示与 PDF 导出共用同一份渲染结果，保证「所见即所导」。
 */
const ReportBody = forwardRef<HTMLDivElement, ReportBodyProps>(
  ({ overviewCards, resourceUsage, detailItems, unitDetails, filterSummary }, ref) => {
    const resources = resourceUsage.resources;

    /** 各资源「总量 / 已分配」对比（vCPU / 内存 / 三个存储池，label 统一为 名称(单位)） */
    const usageCompareData = useMemo(
      () =>
        resources.map((item) => ({
          label: `${item.name}(${item.unit})`,
          total: item.total,
          allocated: item.allocated,
        })),
      [resources],
    );

    const allocationRates = useMemo(
      () =>
        resources.map((item) => ({
          label: `${item.name}(${item.unit})`,
          rate: parseRate(item.allocationRate),
        })),
      [resources],
    );

    /** 三个存储池的分配进度（标存 / SSD / 对象存） */
    const storageProgress = useMemo(
      () =>
        resources
          .filter((item) => STORAGE_POOL_KEYS.includes(item.key))
          .map((item, index) => ({
            key: item.key,
            label: `${item.name}(${item.unit})`,
            rate: parseRate(item.allocationRate),
            allocated: item.allocated,
            total: item.total,
            color: STORAGE_POOL_COLORS[index % STORAGE_POOL_COLORS.length],
          })),
      [resources],
    );

    /** 三张排名图与三维对比共用 unitDetail 数据，各自按本指标降序 */
    const tenantCharts = useMemo(() => {
      const byHost = [...unitDetails].sort((a, b) => b.hostCount - a.hostCount);
      return {
        hostRank: byHost.map((item) => ({ label: item.name, value: item.hostCount })),
        cpuRank: [...unitDetails]
          .map((item) => ({ label: item.name, value: item.cpuCount }))
          .sort((a, b) => b.value - a.value),
        storageRank: [...unitDetails]
          .map((item) => ({ label: item.name, value: item.storageCount }))
          .sort((a, b) => b.value - a.value),
        compareData: byHost.map((item) => ({
          label: item.name,
          hosts: item.hostCount,
          cpu: item.cpuCount,
          storageGB: item.storageCount,
        })),
      };
    }, [unitDetails]);

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
            {overviewCards.map((card, index) => (
              <div className="overview-card" key={card.key}>
                <div className="overview-card-label">{card.name}</div>
                <div className="overview-card-value" style={{ color: METRIC_COLORS[index % METRIC_COLORS.length] }}>
                  {card.value}
                  {card.value !== '--' && card.unit && <small>{card.unit}</small>}
                </div>
                <div className="overview-card-note">{card.subValue === '--' ? `${card.subLabel} --` : card.subValue}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="report-section">
          <h2 className="section-title">资源使用情况</h2>
          <div className="chart-grid chart-grid--2">
            <UsageCompareChart
              title="各资源总量与已分配对比"
              data={usageCompareData}
              totalColor={COMPARE_COLORS.total}
              allocatedColor={COMPARE_COLORS.allocated}
            />
            <VcpuStackChart
              title="各资源堆叠分布（已分配 / 剩余）"
              data={usageCompareData}
              allocatedColor={COMPARE_COLORS.allocated}
              restColor={COMPARE_COLORS.rest}
            />
          </div>
          <div className="chart-grid chart-grid--2">
            <AllocationRateChart data={allocationRates} />
            <AllocationProgressPanel title="存储分配进度" data={storageProgress} />
          </div>
          <div className="chart-grid chart-grid--3">
            <TenantRankChart title="各租户主机数量" unit="台" color={TENANT_COLORS.hosts} items={tenantCharts.hostRank} />
            <TenantRankChart title="各租户CPU配额" unit="核" color={TENANT_COLORS.cpu} items={tenantCharts.cpuRank} />
            <TenantRankChart title="各租户存储量" unit="GB" color={TENANT_COLORS.storage} items={tenantCharts.storageRank} />
          </div>
          <div className="chart-grid chart-grid--1">
            <TenantCompareChart data={tenantCharts.compareData} />
          </div>
        </section>

        <section className="report-section">
          <h2 className="section-title">资源使用情况明细表</h2>
          <ChartCard title="资源使用情况明细">
            <DetailTable items={detailItems} />
          </ChartCard>
        </section>

        <section className="report-section">
          <h2 className="section-title">上云单位资源明细</h2>
          <UnitCards data={unitDetails} />
        </section>
      </div>
    );
  },
);

ReportBody.displayName = 'ReportBody';

export default ReportBody;
