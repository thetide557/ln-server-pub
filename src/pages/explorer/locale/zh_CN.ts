const zh_CN = {
  title: '即时查询',
  add_btn: '新增一个查询面板',
  query_btn: '查询',
  log: {
    search_placeholder: '搜索字段',
    available: '可选字段',
    selected: '已选字段',
    interval: '间隔',
    mode: {
      indexPatterns: 'Index Patterns',
      indices: 'Indices',
    },
    hideChart: '隐藏图表',
    showChart: '显示图表',
    fieldValues_topn: '前 5 个值',
    fieldValues_topnNoData: '该字段存在于 mapping 中，但不存在于显示的 500 个文档中',
    // ---- 第六步 L2（多数据源）：只追加 fe v9.1.0 src/pages/explorer/locale/zh_CN.ts:22-26、:67-71 里
    // 新搬的 Loki 查询页与 RenderValue 组件用到的词条，pub 原有的键一个没动。
    show_conext: 'Show Context',
    context: '日志上下文',
    context_result_count: '结果数',
    context_lines: '上下{{num}}条日志',
    limit: '结果数',
    field_actions: {
      and: '添加到本次检索',
      not: '从本次检索中排除',
      exists: '过滤存在该字段的文档',
    },
  },
  share_tip: '点击复制分享链接', // 第六步 L2：照 fe v9.1.0 同文件 :84；新搬的 explorer/components/Share 用
};
export default zh_CN;
