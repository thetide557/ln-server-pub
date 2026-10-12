import React, { RefObject } from 'react';
import ReportBody from './ReportBody';
import type { ReportData } from '../resourceAnalysisData';

interface ReportExportHostProps {
  /** 待导出的报告数据；为空时不渲染 */
  report: ReportData;
  /** 报告正文根节点引用，供 html2canvas 截图 */
  bodyRef: RefObject<HTMLDivElement>;
  /** 检索栏当前选中值摘要，用于在报告顶部展示筛选条件 */
  filterSummary?: { label: string; value: string }[];
}

/**
 * PDF 导出专用的离屏渲染宿主：固定 1440px 宽渲染完整报告（保证明细表 21 列不被截断），
 * 不可见但真实布局（不能用 display:none，否则 ECharts 无法初始化画布）。
 */
const ReportExportHost: React.FC<ReportExportHostProps> = ({ report, bodyRef, filterSummary }) => {
  const hasData =
    report.overviewCards.length > 0 || report.detailItems.length > 0 || report.unitDetails.length > 0;

  return (
    <div className="report-export-host" aria-hidden={true}>
      {hasData && <ReportBody ref={bodyRef} {...report} filterSummary={filterSummary} />}
    </div>
  );
};

export default ReportExportHost;
