export const SetConfigTables = {}
export const InterfaceForms = [
  { id: 'asset_interface', title: '资产信息接口' },
  { id: 'monitor_interface', title: '监测数据接口' },
  { id: 'alter_interface', title: '告警管理接口' },
  // { id: 'energy_consumption_interface', title: '能耗数据接口' },
  // { id: 'oaop_asset_interface', title: 'OAOP资产同步接口' },
]

export const ParametersForms = [
  {
    id: 'monitor_data_clear_set',
    title: '参数设置',
    items: [
      {
        label: '绑定IP',
        name: 'http_host',
        type: 'input',
        require: true,
      }, {
        label: '启用端口',
        type: 'input',
        name: 'http_port',
        require: true,
      }, {
        label: '启用验证码',
        type: 'switch',
        name: 'captcha',
        require: true,
      }, {
        label: '用户登录token过期时间',
        type: 'input',
        name: 'access_expired',
        require: true,

      }, {
        label: '用户登录token刷新时间',
        type: 'input',
        name: 'refresh_expired',
        require: true,

      }, {
        label: '启动RSA加密',
        type: 'switch',
        name: 'open_rsa',
        require: true,
      }, {
        label: '日志等级',
        type: 'checkbox',
        name: 'log_lever',
        require: true,
        options: [
          {label:'DEBUG',value:1},{label:'INFO',value:2},{label:'WARNING',value:3},{label:'ERROR',value:4}
        ]
      }
    ],
  },

  
]



export const SetConfigForms = {
  organization_set: {
    Modal: {
      title: "组织机构",
      width: 650,
      cancel: Function,
      submit: Function
    },
    itemClick: Function,
    FormOnChange: Function,
    Form: {
      col: 2,
      groups: [],
      items: [
        {
          type: "input",
          name: "name",
          label: "机构名称",
          required: true,
        }, {
          type: "input",
          name: "city",
          label: "城市",
          required: true,

        }, {
          type: "input",
          name: "address",
          label: "地址",
          required: false,
        }, {
          type: "input",
          name: "manger",
          label: "机构负责人",
        }, {
          type: "input",
          name: "phone",
          label: "联系电话",
        }, {
          type: "treeselect",
          name: "parent_id",
          label: "上级组织机构",
          source: 'initial',
        }, {
          type: "textarea",
          name: "description",
          label: "描述",
          col: 2
        }
      ]
    },
    Loading: true,
  }
}
