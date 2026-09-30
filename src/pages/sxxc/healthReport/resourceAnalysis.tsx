import React, { useMemo, useState } from 'react';
import { Select } from 'antd';
import { FundProjectionScreenOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import AllocationProgressPanel from './components/AllocationProgressPanel';
import AllocationRateChart from './components/AllocationRateChart';
import ChartCard from './components/ChartCard';
import DetailTable from './components/DetailTable';
import UnitCards from './components/UnitCards';
import UsageCompareChart from './components/UsageCompareChart';
import VcpuStackChart from './components/VcpuStackChart';
import {
  ALL,
  ASSET_TYPES,
  DIMENSIONS,
  REGIONS,
  SYSTEMS,
  TENANTS,
  buildOverview,
  calcAllocationProgress,
  calcAllocationRates,
  calcDetailRows,
  calcUnitCards,
  calcZoneArchUsage,
  filterUnits,
} from './resourceAnalysisData';
import type { FilterKey, ResourceFilters, SelectOption } from './resourceAnalysisData';
import './resourceAnalysis.less';

/** 指标卡数值配色，浅底上保证对比度 */
const METRIC_COLORS = ['#12b3a6', '#22b35c', '#1668dc', '#7e4ce0', '#d9822b'];
/** 对比柱状图配色：总量 / 已分配 */
const CPU_COLORS = { total: '#1668dc', allocated: '#3ba0f5', rest: '#a9d3f7' };
const MEM_COLORS = { total: '#5b3fa8', allocated: '#8a63e0', rest: '#c7b6f5' };

const withAllOption = (allLabel: string, list: string[]): SelectOption[] => [{ label: allLabel, value: ALL }].concat(list.map((item) => ({ label: item, value: item })));

const ResourceAnalysis: React.FC = () => {
  const [filters, setFilters] = useState<ResourceFilters>({
    region: ALL,
    tenant: ALL,
    system: ALL,
    type: ALL,
    dimension: 'region',
  });

  const options = useMemo(
    () => ({
      region: withAllOption('全部区域', REGIONS),
      tenant: withAllOption('全部租户', TENANTS),
      system: withAllOption('全部业务系统', SYSTEMS),
      type: withAllOption('全部资产类型', ASSET_TYPES),
    }),
    [],
  );

  const filterItems: { key: FilterKey; label: string; options: SelectOption[] }[] = [
    { key: 'region', label: '区域', options: options.region },
    { key: 'tenant', label: '租户', options: options.tenant },
    { key: 'system', label: '业务系统', options: options.system },
    { key: 'type', label: '资产类型', options: options.type },
  ];

  const handleFilterChange = (key: FilterKey) => (value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // 全部模块共用同一份筛选结果，保证与筛选栏联动
  const units = useMemo(() => filterUnits(filters), [filters]);
  const overview = useMemo(() => buildOverview(units), [units]);
  const cpuUsage = useMemo(() => calcZoneArchUsage(units, 'cpu'), [units]);
  const memUsage = useMemo(() => calcZoneArchUsage(units, 'mem'), [units]);
  const allocationRates = useMemo(() => calcAllocationRates(units), [units]);
  const allocationProgress = useMemo(() => calcAllocationProgress(units), [units]);
  const detailRows = useMemo(() => calcDetailRows(units), [units]);
  const unitCards = useMemo(() => calcUnitCards(units), [units]);

  const metrics = [
    { key: 'unit', label: '上云单位', value: overview.unitCount, unit: '户', note: `含商用 ${overview.commercialUnitCount} 户` },
    { key: 'server', label: '云服务器', value: overview.serverCount, unit: '台', note: overview.serverByCharge.map((item) => `${item.chargeType}${item.count}`).join(' / ') },
    { key: 'cpu', label: 'vCPU配额', value: overview.cpuTotal, unit: '核', note: `分配率 ${overview.cpuAllocRate}%` },
    { key: 'storage', label: '存储容量', value: overview.storageTotalGB, unit: 'GB', note: `约 ${overview.storageTotalTB} TB` },
    { key: 'system', label: '业务系统', value: overview.systemCount, unit: '个', note: '已部署上线' },
  ];

  return (
    <PageLayout icon={<FundProjectionScreenOutlined />} title={'资源分析'}>
      <div className='resource-analysis'>
        <section className='resource-analysis-filters'>
          {filterItems.map((item) => (
            <div className='filter-item' key={item.key}>
              <label htmlFor={`resource-analysis-${item.key}`}>{item.label}</label>
              <Select id={`resource-analysis-${item.key}`} value={filters[item.key]} options={item.options} onChange={handleFilterChange(item.key)} />
            </div>
          ))}
          <div className='filter-item'>
            <label htmlFor='resource-analysis-dimension'>汇总维度</label>
            <Select
              id='resource-analysis-dimension'
              value={filters.dimension}
              options={DIMENSIONS}
              onChange={(value: string) => setFilters((prev) => ({ ...prev, dimension: value }))}
            />
          </div>
        </section>

        <section className='resource-analysis-overview'>
          <h2 className='overview-title'>壹 核心指标概览</h2>
          <div className='overview-cards'>
            {metrics.map((metric, index) => (
              <div className='overview-card' key={metric.key}>
                <div className='overview-card-label'>{metric.label}</div>
                <div className='overview-card-value' style={{ color: METRIC_COLORS[index] }}>
                  {metric.value.toLocaleString('en-US')}
                  <small>{metric.unit}</small>
                </div>
                <div className='overview-card-note'>{metric.note}</div>
              </div>
            ))}
          </div>
        </section>

        <section className='report-section'>
          <h2 className='section-title'>贰 资源使用情况</h2>
          <div className='chart-grid chart-grid--2'>
            <UsageCompareChart title='vCPU 总量与已分配对比' unit='核' data={cpuUsage} totalColor={CPU_COLORS.total} allocatedColor={CPU_COLORS.allocated} />
            <UsageCompareChart title='内存总量与已分配对比' unit='GB' data={memUsage} totalColor={MEM_COLORS.total} allocatedColor={MEM_COLORS.allocated} />
          </div>
          <div className='chart-grid chart-grid--1'>
            <AllocationRateChart data={allocationRates} />
          </div>
          <div className='chart-grid chart-grid--2'>
            <VcpuStackChart title='vCPU 堆叠分布（已分配 / 剩余）' unit='核' data={cpuUsage} allocatedColor={CPU_COLORS.allocated} restColor={CPU_COLORS.rest} />
            <AllocationProgressPanel title='存储分配进度' data={allocationProgress} />
          </div>
        </section>

        <section className='report-section'>
          <h2 className='section-title'>三、资源使用情况明细表（含云外部署）</h2>
          <ChartCard title='资源使用情况明细'>
            <DetailTable rows={detailRows} />
          </ChartCard>
        </section>

        <section className='report-section'>
          <h2 className='section-title'>上云单位资源明细</h2>
          <UnitCards data={unitCards} />
        </section>
      </div>
    </PageLayout>
  );
};

export default ResourceAnalysis;
