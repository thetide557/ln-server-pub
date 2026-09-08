const zh_HK = {
  title: '即時查詢',
  add_btn: '新增一個查詢面板',
  query_btn: '查詢',
  log: {
    search_placeholder: '搜尋欄位',
    available: '可選欄位',
    selected: '已選欄位',
    interval: '間隔',
    mode: {
      indexPatterns: 'Index Patterns',
      indices: 'Indices',
    },
    hideChart: '隱藏圖表',
    showChart: '顯示圖表',
    fieldValues_topn: '前 5 個值',
    fieldValues_topnNoData: '該欄位存在於 mapping 中，但不存在於顯示的 500 個文檔中',
    // ---- 第六步 L2（多数据源）：只追加 fe v9.1.0 src/pages/explorer/locale/zh_HK.ts:22-26、:67-71 的词条。
    show_conext: 'Show Context',
    context: '日誌上下文',
    context_result_count: '結果數',
    context_lines: '上下{{num}}條日誌',
    limit: '結果數',
    field_actions: {
      and: '添加到本次檢索',
      not: '從本次檢索中排除',
      exists: '過濾存在該欄位的文檔',
    },
  },
  share_tip: '點擊複製分享鏈接', // 第六步 L2：照 fe v9.1.0 同文件 :84
};

export default zh_HK;
