// 第六步 L1（多数据源）：九种新数据源表单要用、而 pub 的 datasourceManage 词条里没有的 13 个键。
// 值原样取自 fe v9.1.0 src/pages/datasource/locale/zh_HK.ts；
// 在 ./index.ts 里用 addResourceBundle(deep=true, overwrite=false) 挂上去，
// 所以 pub 已有的同名键不会被覆盖，pub 原来的 zh_HK.ts 一个字没改。
const zh_HK = {
  add_title: "創建數據源",
  edit_title: "修改數據源",
  auth_enable: "啟用授權",
  auth: {
    name: "授權"
  },
  endpoint_title: "服務入口",
  skip_tls_verify: "跳過 TLS 驗證",
  form: {
    cluster_tip: "在多個機房的架構下，有時會部署多個告警引擎叢集，對應邊緣機房的數據源，需要關聯相應機房的告警引擎叢集，如果只有一個叢集，保持默認即可",
    logs_max_query_rows: "返回的最大日誌條數",
    protocol: "協議",
    secure_connection: "安全連接（SSL/TLS）",
    skip_tls_verify: "跳過 TLS 驗證",
    url_required_msg: "URL 不能為空",
    url_no_http_msg: "URL 不能以 http:// 或 https:// 開頭"
  }
};
export default zh_HK;
