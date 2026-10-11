const zh_HK = {
  精确: '精確',
  正则: '正則',
  preview: '資料預覽',
  query: {
    title: '查詢統計',
    execute: '查詢',
    query: 'SQL',
    query_required: 'SQL不能為空',
    // ---- N36 批 H1 第 9 条（后端第九份第二节 8、第十份第二节 6）：面板 SQL 写法提示。羚牛自写，上游 fe 无。
    dashboard_sql_tip:
      '時間列要起別名 `AS time`（後端只認 time / __time__ 兩個列名，漏了別名圖是空的、還不報錯）；時序模式下「輔助配置」的「值欄位」必填。',
    query_placeholder: '輸入 SQL 進行查詢，按 Shift+Enter 換行',
    query_placeholder2: '按 Shift+Enter 換行',
    advancedSettings: {
      title: '輔助配置',
      tags_placeholder: '回車輸入多個',
      valueKey: '值字段',
      valueKey_tip: 'SQL 查詢結果通常包含多個列，您可以指定哪些列的值作為曲線展示在圖表上',
      valueKey_required: '值字段不能為空',
      labelKey: '標籤字段',
      labelKey_tip: 'SQL 查詢結果通常包含多個列，您可以指定哪些列作為曲線的標籤元信息',
    },
    schema: '元信息',
    document: '使用文檔',
    dashboard: {
      mode: {
        label: '查詢模式',
        table: '非時序數據',
        timeSeries: '時序數據',
      },
    },
    historicalRecords: {
      button: '歷史記錄',
      searchPlaceholder: '搜索歷史記錄',
    },
    compass_btn_tip: '點擊查看表數據',
  },
  trigger: {
    title: '告警條件',
    value_msg: '請輸入數值',
  },
  datasource: {
    shards: {
      title: '資料源基本資訊',
      title_tip: '資料庫是否能夠連通依賴 DBA 是否已給相應 DB 使用者授權，如因此未能連通仍可先繼續完成後面的設置，後續再做驗證。',
      addr: '資料庫地址',
      addr_tip: '資料庫地址需唯一',
      db: '資料庫',
      user: '用戶名',
      password: '密碼',
      help: '說明：帳號需對相應資料庫有讀取權限才可繼續後續操作，如修改為其他帳號請盡量使用唯讀權限帳號。',
    },
    max_query_rows: '單次請求允許檢索的最大行數',
    max_idle_conns: '最大空閒連接數',
    max_open_conns: '最大打開連接數',
    conn_max_lifetime: '連接最大生存時間 （單位: 秒）',
    timeout: '超時時間 （單位: 秒）',
    // ---- N36 批 H1 第 1 條：mysql 的 DSN 額外參數（後端鍵 `mysql.dsn_extra_params`）。上游 fe 無此欄，文案自寫。
    dsn_extra_params: 'DSN 額外參數',
    dsn_extra_params_tip: '拼在資料庫連接串後面的參數，寫法同 go-sql-driver，多個用 & 隔開。預設 loc=Local：不填這個的話驅動按 UTC 解析時間列，查出來的時間會整體偏 8 小時。',
  },
};

export default zh_HK;
