const en_US = {
  title: 'Explorer',
  add_btn: 'Add a query panel',
  query_btn: 'Execute',
  log: {
    search_placeholder: 'Search field',
    available: 'Available fields',
    selected: 'Selected fields',
    interval: 'Interval',
    mode: {
      indexPatterns: 'Index Patterns',
      indices: 'Indices',
    },
    hideChart: 'Hide chart',
    showChart: 'Show chart',
    fieldValues_topn: 'Top 5 values',
    fieldValues_topnNoData: 'The field present in the mapping, but not in the 500 documents',
    // ---- 第六步 L2（多数据源）：只追加 fe v9.1.0 src/pages/explorer/locale/en_US.ts:22-26、:67-71 的词条。
    show_conext: 'Show context',
    context: 'Log context',
    context_result_count: 'Results',
    context_lines: '{{num}} lines of context',
    limit: 'Limit',
    field_actions: {
      and: 'Filter for value',
      not: 'Filter out value',
      exists: 'Filter for field present',
    },
  },
  share_tip: 'Click to copy the share link', // 第六步 L2：照 fe v9.1.0 同文件 :84
};
export default en_US;
