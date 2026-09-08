// 第六步 L1（多数据源）：九种新数据源表单要用、而 pub 的 datasourceManage 词条里没有的 13 个键。
// 值原样取自 fe v9.1.0 src/pages/datasource/locale/zh_CN.ts；
// 在 ./index.ts 里用 addResourceBundle(deep=true, overwrite=false) 挂上去，
// 所以 pub 已有的同名键不会被覆盖，pub 原来的 zh_CN.ts 一个字没改。
const zh_CN = {
  add_title: "创建数据源",
  edit_title: "修改数据源",
  auth_enable: "开启授权",
  auth: {
    name: "授权"
  },
  endpoint_title: "服务入口",
  skip_tls_verify: "跳过 TLS 检查",
  form: {
    cluster_tip: "在多个机房的架构下，有时会部署多个告警引擎集群，对应边缘机房的数据源，需要关联相应机房的告警引擎集群，如果只有一个集群，保持默认即可",
    logs_max_query_rows: "返回的最大日志条数",
    protocol: "协议",
    secure_connection: "安全连接（SSL/TLS）",
    skip_tls_verify: "跳过 TLS 验证",
    url_required_msg: "URL 不能为空",
    url_no_http_msg: "URL 不能以 http:// 或 https:// 开头"
  }
};
export default zh_CN;
