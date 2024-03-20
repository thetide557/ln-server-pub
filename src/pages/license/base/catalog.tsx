export const SetConfigTables = {}
export const SetConfigForms = {
  organization_set: {
    Modal: {
      title: "组织机构",
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
          name: "序列号",
          label: "序列号",
          // required:true,
        },{
          type: "input",
          name: "采集器信息",
          label: "采集器信息",
          // required:true,
          
        }, {
          type: "input",
          name: "主版本号",
          label: "主版本号",
          // required:false,
        },{
          type: "input",
          name: "采集器版本号",
          label: "采集器版本号",
        },{
          type: "input",
          name: "有效模块",
          label: "有效模块",
        },{
          type: "input",
          name: "有效期",
          label: "有效期",
          // source:'initial',          
        },{
          type: "input",
          name: "许可节点数",
          label: "许可节点数",
          // col:2
        },{
          type: "input",
          name: "已用许可节点",
          label: "已用许可节点",
        }
      ]
    },
    Loading: true,
  } 
}
