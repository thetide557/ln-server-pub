const zh_HK = {
  es: {
    ref: '名稱',
    index: '索引',
    index_tip: `
      支援多種配置方式
      <1/>
      1. 指定單個索引 gb 在 gb 索引中搜索所有的文件
      <1/>
      2. 指定多個索引 gb,us 在 gb 和 us 索引中搜索所有的文件
      <1/>
      3. 指定索引字首 g*,u* 在任何以 g 或者 u 開頭的索引中搜索所有的文件
      <1/>
      `,
    index_msg: '索引不能為空',
    indexPatterns: '索引模式',
    indexPattern_msg: '索引模式不能為空',
    filter: '過濾條件',
    // 第六步 第4段 W3a（ES 组 U-ES-01）：v9 ES 告警编辑器要用、pub 这份 v6 时代语言包里没有的 key，
    // 值逐字抄 fe v9.1.0 src/locales/datasource/locale/zh_HK.ts（只加不改，pub 原有的 key 一个没动）。
    index_placeholder: '索引 log-*（支持通配符）',
    index_pattern_placeholder: '選擇索引模式',
    filter_placeholder: '過濾條件 status:500 AND method:GET',
    offset_tip: '用於查詢指定時間段之前的資料，類似 PromQL 中的 offset，單位為秒',
    time_label: '時間顆粒度',
    date_field: '日期欄位',
    date_field_msg: '日期欄位不能為空',
    interval: '時間間隔',
    value: '數值提取',
    func: '函數',
    funcField: '字段名',
    terms: {
      more: '高階設定',
      size: '匹配個數',
      min_value: '文件最小值',
      // 第六步 第4段 W3a（ES 组 U-ES-01）：v9 的 Terms / Histgram 用的是 min_doc_count 这个 key，
      // 值同 fe v9.1.0；pub 原有的 min_value 是羚牛存量、还有别处在用，保留不动。
      min_doc_count: '文件最小值',
    },
    raw: {
      limit: '日誌條數',
    },
    alert: {
      query: {
        title: '查詢統計',
        preview: '資料預覽',
      },
      trigger: {
        title: '告警條件',
        builder: '簡單模式',
        code: '表示式模式',
        label: '關聯 Label',
      },
      prom_eval_interval_tip: '每隔 {{num}} 秒，去查詢後端儲存',
      prom_for_duration_tip:
        '通常持續時長大於執行頻率，在持續時長內按照執行頻率多次執行查詢，每次都觸發才生成告警；如果持續時長置為 0，表示只要有一次查詢的資料滿足告警條件，就生成告警',
      advancedSettings: '高階設定',
      delay: '延遲執行',
    },
    event: {
      groupBy: `根據 {{field}} 分組，匹配個數 {{size}}, 文檔最小值 {{min_value}}`,
    },
  },
  // ---- 第六步 L1（多数据源）：见 zh_CN 同段说明；取自 fe v9.1.0 src/locales/datasource/locale/zh_HK.ts。
  datasource: {
    max_query_rows: '單次請求允許檢索的最大行數',
    max_idle_conns: '最大空閒連接數',
    max_open_conns: '最大打開連接數',
    conn_max_lifetime: '連接最大生存時間 （單位: 秒）',
    timeout: '超時時間 （單位: 秒）',
    timeout_ms: '超時時間 （單位: 毫秒）',
  },
};

export default zh_HK;
