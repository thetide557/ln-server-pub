// 第六步 L1（多数据源）：九种新数据源表单要用、而 pub 的 datasourceManage 词条里没有的 13 个键。
// 值原样取自 fe v9.1.0 src/pages/datasource/locale/en_US.ts；
// 在 ./index.ts 里用 addResourceBundle(deep=true, overwrite=false) 挂上去，
// 所以 pub 已有的同名键不会被覆盖，pub 原来的 en_US.ts 一个字没改。
const en_US = {
  add_title: "Add data source",
  edit_title: "Edit data source",
  auth_enable: "Enable auth",
  auth: {
    name: "Auth"
  },
  endpoint_title: "Service entry",
  skip_tls_verify: "Skip TLS verification",
  form: {
    // ---- 第六步 ES 升级轮（step6f）：L1 的 Detail.tsx 按 fe v9.1.0 覆盖后要用这两个键，
    //      pub 的 datasourceManage 词条里没有；值原样取自 fe v9.1.0 src/pages/datasource/locale/en_US.ts。
    es: {
      write_config: "Write settings",
      disable_write: "Disable write"
    },
    cluster_tip: "In a multi-datacenter architecture, multiple alerting engine clusters are sometimes deployed. A data source of an edge datacenter must be associated with the alerting engine cluster of that datacenter. If there is only one cluster, keep the default",
    cluster_not_found: "The associated alerting engine has been disabled, so alerting no longer works for this data source. Check the alerting engine configuration or associate the data source with another alerting engine",
    logs_max_query_rows: "Maximum number of returned log entries",
    protocol: "Protocol",
    secure_connection: "Secure connection (SSL/TLS)",
    skip_tls_verify: "Skip TLS verify",
    url_required_msg: "URL cannot be empty",
    url_no_http_msg: "URL cannot start with http:// or https://",
    // ---- N36 批 H1 第 7 / 8 条（后端第九份第二节 6 / 7）：两句新提示，上游 fe 没有、羚牛自写。
    // 这份文件原本只放「上游有、pub 缺」的键，这两条是自写文案，放这里是因为 datasourceManage
    // 这个命名空间的新键都挂在它上面（见 ./index.ts 的 addResourceBundle(deep=true, overwrite=false)）。
    cluster_match_tip: "Defaults to default. This name must match the alerting engine name exactly; if it does not, none of the alert rules on this data source are ever evaluated, and nothing on the page says so.",
    vl_addr_tip: "Enter only scheme, host and port - no path and no trailing slash, e.g. http://localhost:9428."
  }
};
export default en_US;
