import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import JSZip from 'jszip';

/** A4 纸宽高（pt） */
const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
/** 页边距（pt） */
const PAGE_MARGIN = 14;
const CONTENT_WIDTH = A4_WIDTH - PAGE_MARGIN * 2;
const CONTENT_HEIGHT = A4_HEIGHT - PAGE_MARGIN * 2;
/** 导出截图的设备像素比，越大越清晰，2 兼顾清晰度与性能 */
const EXPORT_SCALE = 2;
/** 需要纳入 PDF 的正文区块 */
const SECTION_SELECTOR = '.resource-analysis-overview, .report-section';

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** 替换 Windows / macOS 文件名中的非法字符 */
export const sanitizeFileName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '_').trim() || '未命名';

/** 区块之间的视觉间隔（pt） */
const SECTION_GAP_PT = 16;

/**
 * 将报告正文根元素按区块分别截图并合成为一个 A4 纵向 PDF。
 * 分区块截图可避免整页过高触发浏览器 canvas 尺寸上限；
 * 区块之间连续排版，仅当剩余空间放不下时才翻页，消除大块空白。
 */
export const captureReportPdfBlob = async (root: HTMLElement): Promise<Blob> => {
  const sections = Array.from(root.querySelectorAll<HTMLElement>(SECTION_SELECTOR));
  if (sections.length === 0) throw new Error('未找到可导出的报告内容');

  const pdf = new jsPDF('p', 'pt', 'a4');
  let pageY = PAGE_MARGIN; // 当前页的写入光标（pt）

  for (let i = 0; i < sections.length; i += 1) {
    const canvas = await html2canvas(sections[i], {
      scale: EXPORT_SCALE,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const ratio = CONTENT_WIDTH / canvas.width;
    let sourceY = 0; // 区块 canvas 中已消费的高度（px）

    while (sourceY < canvas.height - 0.5) {
      const remainingPt = PAGE_MARGIN + CONTENT_HEIGHT - pageY;
      // 当前页剩余空间能容纳的 px 高度
      const slicePx = Math.min(canvas.height - sourceY, remainingPt / ratio);
      const slicePt = slicePx * ratio;

      // 截取当前片段
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.ceil(slicePx);
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) break;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

      pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', PAGE_MARGIN, pageY, CONTENT_WIDTH, slicePt);

      sourceY += slicePx;
      pageY += slicePt;

      // 当前页画满了，但区块还有剩余 → 翻页
      if (pageY >= PAGE_MARGIN + CONTENT_HEIGHT - 0.5 && sourceY < canvas.height - 0.5) {
        pdf.addPage();
        pageY = PAGE_MARGIN;
      }
    }

    // 区块结束后加一小段间隔，与下一区块区分
    if (i < sections.length - 1) {
      pageY += SECTION_GAP_PT;
      if (pageY > PAGE_MARGIN + CONTENT_HEIGHT) {
        pdf.addPage();
        pageY = PAGE_MARGIN;
      }
    }
  }

  return pdf.output('blob');
};

/** 通过临时链接触发浏览器下载 */
const saveBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // 延迟回收，确保浏览器已接管下载
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};

/** 直接下载单个 PDF */
export const downloadPdf = (blob: Blob, fileName: string) => {
  saveBlob(blob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
};

/** 将多个 PDF 打包进同一文件夹的 zip，解压后即为一个完整目录 */
export const bundlePdfsToZip = async (folderName: string, files: { name: string; blob: Blob }[]): Promise<Blob> => {
  const zip = new JSZip();
  const folder = zip.folder(sanitizeFileName(folderName)) ?? zip;
  files.forEach((file) => {
    folder.file(sanitizeFileName(file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`), file.blob);
  });
  return zip.generateAsync({ type: 'blob' });
};

export const downloadZip = (blob: Blob, fileName: string) => {
  saveBlob(blob, fileName.endsWith('.zip') ? fileName : `${fileName}.zip`);
};
