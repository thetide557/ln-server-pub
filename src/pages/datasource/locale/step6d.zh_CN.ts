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
    // ---- 第六步 ES 升级轮（step6f）：L1 的 Detail.tsx 按 fe v9.1.0 覆盖后要用这两个键，
    //      pub 的 datasourceManage 词条里没有；值原样取自 fe v9.1.0 src/pages/datasource/locale/zh_CN.ts。
    es: {
      write_config: "写配置",
      disable_write: "不允许写入"
    },
    cluster_tip: "在多个机房的架构下，有时会部署多个告警引擎集群，对应边缘机房的数据源，需要关联相应机房的告警引擎集群，如果只有一个集群，保持默认即可",
    cluster_not_found: "关联告警引擎已停用，当前数据源的告警不再生效。请检查告警引擎配置或重新修改数据源关联的告警引擎",
    logs_max_query_rows: "返回的最大日志条数",
    protocol: "协议",
    secure_connection: "安全连接（SSL/TLS）",
    skip_tls_verify: "跳过 TLS 验证",
    url_required_msg: "URL 不能为空",
    url_no_http_msg: "URL 不能以 http:// 或 https:// 开头",
    // ---- N36 批 H1 第 7 / 8 条（后端第九份第二节 6 / 7）：两句新提示，上游 fe 没有、羚牛自写。
    // 这份文件原本只放「上游有、pub 缺」的键，这两条是自写文案，放这里是因为 datasourceManage
    // 这个命名空间的新键都挂在它上面（见 ./index.ts 的 addResourceBundle(deep=true, overwrite=false)）。
    cluster_match_tip: "默认填 default；这里的名字必须和告警引擎的名字一样，不一样的话这个数据源下的告警规则一条都不会被求值（界面上不会报错）。",
    vl_addr_tip: "只填协议、主机和端口，不要带路径，也不要带结尾的斜杠，例如 http://localhost:9428。"
  }
};
export default zh_CN;
