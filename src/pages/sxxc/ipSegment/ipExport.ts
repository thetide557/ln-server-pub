/**
 * IP 列表文件导出 / 导入模板生成（前端生成，mock 阶段）
 * 供 IP 明细页与主页面 IP 视角的「批量导出 / 批量导入」共用
 * 弹窗形态参考：操作日志页「批量导出」（Excel/XML/TXT 三选）与资产清单页「导入设备」（选择文件 + 浏览 + 下载模板）
 * 后端导出/导入接口就绪后替换为文件流下载 / FormData 上传
 */
import _ from 'lodash';
import { IpItem, ipAllocStatusMap, ipOnlineStatusMap, ipUseStatusMap } from './types';

/** 导出/模板表头（与 IP 表格列一致） */
const CSV_HEADERS = [
  'IP地址',
  'IP分配状态',
  'IP使用状态',
  '资产在线状态',
  '资产名称',
  'MAC地址',
  '接入端口',
  '临时IP',
  '网关',
  '最后在线时间',
  '闲置天数',
  '备注',
];

/** XML 导出字段名（与表头一一对应） */
const XML_FIELDS = [
  'ipAddress',
  'allocStatus',
  'useStatus',
  'onlineStatus',
  'assetName',
  'mac',
  'port',
  'tempIp',
  'gateway',
  'lastOnlineTime',
  'idleDays',
  'note',
];

/** IP 行 -> 单元格数组（与 CSV_HEADERS 顺序一致） */
const ipRow = (item: IpItem): (string | number)[] => [
  item.ip,
  ipAllocStatusMap[item.allocStatus]?.text || '-',
  ipUseStatusMap[item.useStatus]?.text || '-',
  ipOnlineStatusMap[item.onlineStatus]?.text || '-',
  item.assetName || '-',
  item.mac || '-',
  item.port || '-',
  item.isTempIp === -1 ? '-' : item.isTempIp === 1 ? '是' : '否',
  item.isGateway === -1 ? '-' : item.isGateway === 1 ? '是' : '否',
  item.lastOnlineTime || '-',
  item.idleDays === undefined || item.idleDays === null ? '-' : item.idleDays,
  item.note || '-',
];

/** CSV 单元格转义：双引号包裹，内部双引号翻倍 */
const csvCell = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;

/** 文件名时间戳（参考操作日志导出命名 MMDDHHmmss） */
const timestamp = () => {
  const ts = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
};

/** 触发浏览器下载 */
const triggerDownload = (content: string, fileName: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/** 导出格式：1 Excel 2 XML 3 TXT（参考操作日志「批量导出」弹窗选项） */
export type IpExportType = 1 | 2 | 3;

/** 按格式导出 IP 列表文件（文件名参考操作日志导出：「IP信息数据_MMDDHHmmss.后缀」） */
export function exportIpsToFile(records: IpItem[], fileType: IpExportType) {
  if (_.isEmpty(records)) return;
  const rows = _.map(records, ipRow);
  if (fileType === 2) {
    const esc = (val: string | number) =>
      String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>\n<ipList>\n' +
      _.map(rows, (row) => {
        const fields = _.map(row, (cell, idx) => `    <${XML_FIELDS[idx]}>${esc(cell)}</${XML_FIELDS[idx]}>`);
        return `  <ip>\n${fields.join('\n')}\n  </ip>`;
      }).join('\n') +
      '\n</ipList>';
    triggerDownload(xml, `IP信息数据_${timestamp()}.xml`, 'text/xml;charset=utf-8;');
    return;
  }
  if (fileType === 3) {
    const tsv = _.map([CSV_HEADERS, ...rows], (row) => row.join('\t')).join('\r\n');
    triggerDownload(`\uFEFF${tsv}`, `IP信息数据_${timestamp()}.txt`, 'text/plain;charset=utf-8;');
    return;
  }
  // Excel：CSV 格式（带 BOM，Excel 可直接打开）
  const csv = _.map([CSV_HEADERS, ...rows], (row) => _.map(row, csvCell).join(',')).join('\r\n');
  triggerDownload(`\uFEFF${csv}`, `IP信息数据_${timestamp()}.csv`, 'text/csv;charset=utf-8;');
}

/** 下载 IP 导入模板（表头 + 示例行，参考「导入设备」下载模板） */
export function downloadIpImportTemplate() {
  const sample = [
    '10.20.3.10',
    '未分配',
    '未使用',
    '-',
    '示例资产名称',
    'AA:BB:CC:DD:EE:FF',
    'Gig0/1',
    '否',
    '否',
    '2026-09-24 08:02',
    0,
    '示例备注',
  ];
  const csv = _.map([CSV_HEADERS, sample], (row) => _.map(row, csvCell).join(',')).join('\r\n');
  triggerDownload(`\uFEFF${csv}`, `IP导入模板_${timestamp()}.csv`, 'text/csv;charset=utf-8;');
}
