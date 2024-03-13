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
          name: "name",
          label: "机构名称",
          required:true,
        },{
          type: "input",
          name: "city",
          label: "城市",
          required:true,
          
        }, {
          type: "input",
          name: "address",
          label: "地址",
          required:false,
        },{
          type: "input",
          name: "manger",
          label: "机构负责人",
        },{
          type: "input",
          name: "phone",
          label: "联系电话",
        },{
          type: "treeselect",
          name: "parent_id",
          label: "上级组织机构",
          source:'initial',          
        },{
          type: "textarea",
          name: "description",
          label: "描述",
          col:2
        }
      ]
    },
    Loading: true,
  } 
}
