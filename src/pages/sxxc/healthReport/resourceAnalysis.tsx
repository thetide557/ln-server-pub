import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, message, Select, Spin } from 'antd';
import { DownloadOutlined, FileZipOutlined, FundProjectionScreenOutlined } from '@ant-design/icons';
import PageLayout from '@/components/pageLayout';
import { getResourceUnits } from '@/services/sxxc/healthReport';
import type { CloudUnitRecord } from '@/services/sxxc/healthReport';
import ReportBody from './components/ReportBody';
import ReportExportHost from './components/ReportExportHost';
import { ALL, buildFilterOptions, filterUnits } from './resourceAnalysisData';
import type { FilterKey, ResourceFilters, SelectOption } from './resourceAnalysisData';
import {
  bundlePdfsToZip,
  captureReportPdfBlob,
  downloadPdf,
  downloadZip,
  sanitizeFileName,
  sleep,
} from './reportPdf';
import './resourceAnalysis.less';

const withAllOption = (allLabel: string, list: string[]): SelectOption[] =>
  [{ label: allLabel, value: ALL }].concat(list.map((item) => ({ label: item, value: item })));

/** 等待浏览器完成两帧绘制（React 提交 + ECharts 初始化后的布局已稳定） */
const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

/** ECharts 默认动画约 1s，导出前等待动画结束，避免截到半程动画 */
const CHART_SETTLE_MS = 1300;

const dateStamp = () => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
};

type ExportingType = '' | 'current' | 'tenants';

const ResourceAnalysis: React.FC = () => {
  const [filters, setFilters] = useState<ResourceFilters>({
    region: ALL,
    tenant: ALL,
    system: ALL,
    type: ALL,
  });
  const [allUnits, setAllUnits] = useState<CloudUnitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ExportingType>('');
  const [exportProgress, setExportProgress] = useState({ done: 0, total: 0 });
  /** 离屏导出宿主当前渲染的租户数据 */
  const [exportUnits, setExportUnits] = useState<CloudUnitRecord[]>([]);

  const bodyRef = useRef<HTMLDivElement>(null);
  const exportBodyRef = useRef<HTMLDivElement>(null);

  // 接口拉取上云单位资源明细，聚合口径全部在前端完成
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getResourceUnits()
      .then((list) => {
        if (!cancelled) setAllUnits(list);
      })
      .catch(() => {
        // 全局请求拦截器已有错误提示，这里仅兜底为空数据
        if (!cancelled) setAllUnits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filterOptions = useMemo(() => buildFilterOptions(allUnits), [allUnits]);

  const options = useMemo(
    () => ({
      region: withAllOption('全部区域', filterOptions.region),
      tenant: withAllOption('全部租户', filterOptions.tenant),
      system: withAllOption('全部业务系统', filterOptions.system),
      type: withAllOption('全部资产类型', filterOptions.type),
    }),
    [filterOptions],
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
  const units = useMemo(() => filterUnits(allUnits, filters), [allUnits, filters]);

  /** 导出当前页（按当前筛选条件所见内容）为 PDF */
  const handleExportCurrent = async () => {
    if (!bodyRef.current || units.length === 0) {
      message.warning('当前没有可导出的数据');
      return;
    }
    setExporting('current');
    const hide = message.loading('正在生成 PDF，请稍候…', 0);
    try {
      const blob = await captureReportPdfBlob(bodyRef.current);
      downloadPdf(blob, `资源分析报告_${dateStamp()}.pdf`);
      message.success('当前页 PDF 已导出');
    } catch (error) {
      console.error(error);
      message.error('PDF 导出失败，请重试');
    } finally {
      hide();
      setExporting('');
    }
  };

  /** 按租户逐个导出 PDF，并打包为一个 zip 文件夹下载 */
  const handleExportByTenant = async () => {
    if (units.length === 0) {
      message.warning('当前没有可导出的数据');
      return;
    }
    // 租户清单基于当前筛选结果，区域/业务系统/资产类型等条件同样生效
    const tenantNames = Array.from(new Set(units.map((unit) => unit.name)));
    setExporting('tenants');
    setExportProgress({ done: 0, total: tenantNames.length });
    message.loading({ content: `正在导出租户报告（0/${tenantNames.length}）…`, key: 'tenant-export', duration: 0 });
    try {
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < tenantNames.length; i += 1) {
        const tenantName = tenantNames[i];
        const tenantUnits = units.filter((unit) => unit.name === tenantName);
        setExportUnits(tenantUnits);
        await waitForPaint();
        await sleep(CHART_SETTLE_MS);
        if (!exportBodyRef.current) throw new Error('导出容器未就绪');

        const blob = await captureReportPdfBlob(exportBodyRef.current);
        files.push({ name: sanitizeFileName(`资源分析报告_${tenantName}.pdf`), blob });
        setExportProgress({ done: i + 1, total: tenantNames.length });
        message.loading({ content: `正在导出租户报告（${i + 1}/${tenantNames.length}）：${tenantName}`, key: 'tenant-export', duration: 0 });
      }

      const folderName = `租户资源分析报告_${dateStamp()}`;
      const zipBlob = await bundlePdfsToZip(folderName, files);
      downloadZip(zipBlob, `${folderName}.zip`);
      message.success({ content: `已导出 ${tenantNames.length} 个租户的 PDF（打包为 zip）`, key: 'tenant-export' });
    } catch (error) {
      console.error(error);
      message.error({ content: '租户 PDF 批量导出失败，请重试', key: 'tenant-export' });
    } finally {
      setExportUnits([]);
      setExportProgress({ done: 0, total: 0 });
      setExporting('');
    }
  };

  const exportDisabled = exporting !== '' || loading || units.length === 0;

  return (
    <PageLayout icon={<FundProjectionScreenOutlined />} title={'资源分析'}>
      <div className="resource-analysis">
        <Spin spinning={loading}>
          <div className="resource-analysis-body">
            <section className="resource-analysis-filters">
              {filterItems.map((item) => (
                <div className="filter-item" key={item.key}>
                  <label htmlFor={`resource-analysis-${item.key}`}>{item.label}</label>
                  <Select
                    id={`resource-analysis-${item.key}`}
                    value={filters[item.key]}
                    options={item.options}
                    onChange={handleFilterChange(item.key)}
                  />
                </div>
              ))}
              <div className="export-actions">
                <Button icon={<DownloadOutlined />} onClick={handleExportCurrent} loading={exporting === 'current'} disabled={exportDisabled}>
                  导出当前页
                </Button>
                <Button
                  type="primary"
                  icon={<FileZipOutlined />}
                  onClick={handleExportByTenant}
                  loading={exporting === 'tenants'}
                  disabled={exportDisabled}
                >
                  {exporting === 'tenants' && exportProgress.total > 0
                    ? `按租户导出（${exportProgress.done}/${exportProgress.total}）`
                    : '按租户导出'}
                </Button>
              </div>
            </section>

            <ReportBody ref={bodyRef} units={units} />
          </div>
        </Spin>
      </div>
      <ReportExportHost units={exportUnits} bodyRef={exportBodyRef} />
    </PageLayout>
  );
};

export default ResourceAnalysis;
