const en_US = {
  preview: 'Preview',
  query: {
    title: 'Query',
    execute: 'Execute',
    query: 'SQL',
    query_required: 'SQL is required',
    // ---- N36 批 H1 第 9 条（后端第九份第二节 8、第十份第二节 6）：面板 SQL 写法提示。羚牛自写，上游 fe 无。
    dashboard_sql_tip:
      'Alias the time column as `AS time` (the backend only recognises the column names time / __time__; without the alias the chart is empty and nothing is reported); in time-series mode the value field under Auxiliary settings is required.',
    query_placeholder: 'Enter SQL to query. Press Shift+Enter for a new line',
    query_placeholder2: 'Press Shift+Enter for a new line',
    advancedSettings: {
      title: 'Auxiliary settings',
      tags_placeholder: 'Enter multiple tags by pressing Enter',
      valueKey: 'Value field',
      valueKey_tip: 'SQL query results usually contain multiple columns; specify which columns are displayed as series on the chart',
      valueKey_required: 'Value field is required',
      labelKey: 'Label field',
      labelKey_tip: 'SQL query results usually contain multiple columns; specify which columns are used as label metadata for series',
    },
    schema: 'Schema',
    document: 'Document',
    dashboard: {
      mode: {
        label: 'Query mode',
        table: 'Table',
        timeSeries: 'Time series',
      },
    },
    historicalRecords: {
      button: 'Historical records',
      searchPlaceholder: 'Search historical records',
    },
    compass_btn_tip: 'Click to view table data',
  },
  trigger: {
    title: 'Trigger',
    value_msg: 'Please enter the expression value',
  },
  datasource: {
    shards: {
      title: 'Data source basic information',
      title_tip:
        'Whether the database can be connected depends on whether the DBA has granted the corresponding DB user authorization. If it cannot be connected due to this reason, you can continue to complete the subsequent settings first, and then verify later.',
      addr: 'Database address',
      addr_tip: 'The database address must be unique',
      user: 'Username',
      password: 'Password',
      help: 'Note: The account needs to have read permission for the corresponding database to continue subsequent operations. If you change to another account, try to use a read-only account.',
    },
  },
};
export default en_US;
