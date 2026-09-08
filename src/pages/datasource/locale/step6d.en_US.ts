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
    cluster_tip: "In a multi-datacenter architecture, multiple alerting engine clusters are sometimes deployed. A data source of an edge datacenter must be associated with the alerting engine cluster of that datacenter. If there is only one cluster, keep the default",
    logs_max_query_rows: "Maximum number of returned log entries",
    protocol: "Protocol",
    secure_connection: "Secure connection (SSL/TLS)",
    skip_tls_verify: "Skip TLS verify",
    url_required_msg: "URL cannot be empty",
    url_no_http_msg: "URL cannot start with http:// or https://"
  }
};
export default en_US;
