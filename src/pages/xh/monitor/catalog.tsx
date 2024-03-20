export const SetConfigTables = {}
export const SetConfigForms = {
  asset_type_set: {
    Modal: {
      title: "资产类型",
      width: 650,
      cancel: Function,
      submit: Function
    },
    itemClick:Function,
    FormOnChange: Function,
    Form: {
      col: 2,
      groups:[],
      items: [
        {
          type: "input",
          name: "name",
          label: "设备类型",
          required:true,
        },{
          type: "select",
          name: "types",
          label: "类型",
          option: [{value:1,label:"设备类型"},{value:1,label:"备件设备烈性"}],
          required:true,
        }
      ]
    },
    Loading: true,
  },
  asset_set: {
    Modal: {
      title: "资产信息",
      width: 650,
      cancel: Function,
      submit: Function
    },
    itemClick:Function,
    FormOnChange: Function,
    Form: {
      col: 2,
      groups:[],
      items: [
        {
          type: "input",
          name: "name",
          label: "资产名称",
          required:true,
        },{
          type: "treeselect",
          name: "organization_id",
          label: "所属组织机构",
          data_type:"int",
          required:true,
          source:'initial',  
        },{
          type: "select",
          name: "type",
          label: "资产类型",
          required:true,
          source:'initial',           
        }, {
          type: "input",
          name: "ip",
          label: "IP地址",
          required:true,
        },{
          type: "select",
          name: "producer",
          label: "厂商",
          required:true,
          source:'initial', 
        },{
          type: "select",
          name: "os",
          label: "操作系统",
          required:true,
          source:'initial',
        },{
          type: "select",
          name: "cpu",
          label: "CPU",
          data_type:"int",
          required:true,
          source:'initial',
        },{
          type: "select",
          name: "memory",
          label: "内存",
          required:true,
          data_type:"int",
          source:'initial',
        },{
          type: "input",
          name: "plugin_version",
          label: "插件版本",
        },{
          type: "input",
          name: "location",
          label: "资产位置",
        },{
          type: "select",
          name: "asset_status",
          label: "状态",
          source:'initial',          
        },{
          type: "treeselect",
          name: "directory_id",
          label: "所在目录",
          data_type:"int",
          required:true,
          source:'initial',          
        },{
          type: "textarea",
          name: "memo",
          label: "描述",
          col:2
        }
      ]
    },
    Loading: true,
  } 
}
