// 第六步：夜莺前端的 basePrefix（子路径部署前缀）在 fe/src/App.tsx:135 由 VITE_PREFIX 决定；
// pub 部署在站点根路径、没有这个变量，写死空串。AiChatNG/useStream.ts 从这里 import（S3 改）。
export const basePrefix = '';
