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
          name: "设备",
          label: "设备",
          // required:true,
        },{
          type: "input",
          name: "设备序列号",
          label: "设备序列号",
          // required:true,
          
        }, {
          type: "treeselect",
          name: "设备类型",
          label: "设备类型",
          // required:false,
         
        },{
          type: "input", 
          name: "采集器信息",
          label: "采集器信息",
        },{
          type: "input",
          name: "首次创建监测",
          label: "首次创建监测",
        },{
          type: "input",
          name: "所在机房",
          label: "所在机房",
          // source:'initial',          
        },{
          type: "input",
          name: "位置",
          label: "位置",
          // col:2
        }
      ]
    },
    Loading: true,
  } 
}
