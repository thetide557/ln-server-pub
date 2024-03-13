import { DictValueEnumObj } from '@/components/DictTag';
import { Space } from 'antd';
import React from 'react';

export const SetConfigTables = {
  device_model_set: {
    searchOption: [
      {
        type: "select",
        name: "producer",
        require: false,
        label: "厂商",
        placeholder: "请选择厂商",
        source: 'initial'
      },
      {
        type: "input",
        name: "query",
        require: false,
        label: "关键词",
        width: "300px",
        placeholder: "型号/带外版本/描述",
      },
    ],
    itemClick:Function,
    ButtonArr: [
      {
        ButtonText: "添加",
        type: "primary",
        Action:'add',
        ClickFun: Function
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: Function
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: Function
      }, {
        ButtonText: "导出",
        Action:'export',
        ClickFun: Function
      }
    ],
    TableColumns: [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '厂商',
        dataIndex: 'alias',
        key: 'alias',
      },
      {
        title: '型号',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '带外版本',
        dataIndex: 'out_band_version',
        key: 'out_band_version',
      },
      {
        title: 'U数',
        dataIndex: 'u_number',
        key: 'u_number',
      },
      {
        title: '描述',
        dataIndex: 'describe',
        key: 'describe',
      },

    ],
    TableData: []
  },
  producer: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'alias',
        key: 'alias',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'chinese_name',
        key: 'chinese_name',
      },
      {
        title: '公司名称',
        dataIndex: 'company_name',
        key: 'company_name',
      },
      {
        title: '官方站点',
        dataIndex: 'official',
        key: 'official',
      },
      {
        title: '是否国产',
        dataIndex: 'is_domestic',
        key: 'is_domestic',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      },
      {
        title: '是否显示中文',
        dataIndex: 'is_display_chinese',
        key: 'is_display_chinese',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      }],
    TableData: []
  },
  third_party_maintenance: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '维保服务商简称',
        dataIndex: 'alias',
        key: 'alias',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'chinese_name',
        key: 'chinese_name',
      },
      {
        title: '公司名称',
        dataIndex: 'company_name',
        key: 'company_name',
      },
      {
        title: '地址',
        dataIndex: 'official',
        key: 'official',
      },
      {
        title: '传真',
        dataIndex: 'fax',
        key: 'fax',
      },
      {
        title: '联系人',
        dataIndex: 'contact_person',
        key: 'contact_person',
      },
      {
        title: '联系人电话',
        dataIndex: 'contact_number',
        key: 'contact_number',
      },
      {
        title: '联系人邮箱',
        dataIndex: 'contact_email',
        key: 'contact_email',
      },
      {
        title: '是否国产',
        dataIndex: 'is_domestic',
        key: 'is_domestic',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      },
      {
        title: '是否显示中文',
        dataIndex: 'is_display_chinese',
        key: 'is_display_chinese',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      }
    ],
    TableData: []
  },
  supplier: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '供应商简称',
        dataIndex: 'alias',
        key: 'alias',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'chinese_name',
        key: 'chinese_name',
      },
      {
        title: '公司名称',
        dataIndex: 'company_name',
        key: 'company_name',
      },
      {
        title: '地址',
        dataIndex: 'official',
        key: 'official',
      },
      {
        title: '传真',
        dataIndex: 'fax',
        key: 'fax',
      },
      {
        title: '联系人',
        dataIndex: 'contact_person',
        key: 'contact_person',
      },
      {
        title: '联系人电话',
        dataIndex: 'contact_number',
        key: 'contact_number',
      },
      {
        title: '联系人邮箱',
        dataIndex: 'contact_email',
        key: 'contact_email',
      },
      {
        title: '是否国产',
        dataIndex: 'is_domestic',
        key: 'is_domestic',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      },
      {
        title: '是否显示中文',
        dataIndex: 'is_display_chinese',
        key: 'is_display_chinese',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      }],
    TableData: []
  },
  component_brand: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '部件品牌',
        dataIndex: 'alias',
        key: 'alias',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'chinese_name',
        key: 'chinese_name',
      },
      {
        title: '公司名称',
        dataIndex: 'company_name',
        key: 'company_name',
      },
      {
        title: '地址',
        dataIndex: 'official',
        key: 'official',
      },
      {
        title: '传真',
        dataIndex: 'fax',
        key: 'fax',
      },
      {
        title: '联系人',
        dataIndex: 'contact_person',
        key: 'contact_person',
      },
      {
        title: '联系人电话',
        dataIndex: 'contact_number',
        key: 'contact_number',
      },
      {
        title: '联系人邮箱',
        dataIndex: 'contact_email',
        key: 'contact_email',
      },
      {
        title: '是否国产',
        dataIndex: 'is_domestic',
        key: 'is_domestic',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      },
      {
        title: '是否显示中文',
        dataIndex: 'is_display_chinese',
        key: 'is_display_chinese',
        render(val) {
          return val!==null && val=='0'?'否':'是';
        }
      }],
    TableData: []
  },
  spare_party_base: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  party_type: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  device_type: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  inventory_alert_set: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  warehouse_information: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  asset_expansion_set: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  asset_expand_field: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入数据项别名和描述",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '所在内容分类',
        dataIndex: 'type_code',
        key: 'type_code',
        width: 180,
        render(val) {
          return '基本信息';
        }
        
      },
      {
        title: '数据项别名',
        dataIndex: 'dict_value',
        key: 'dict_value',
      },
      {
        title: '数据项序号',
        dataIndex: 'sn',
        key: 'sn',
      },
      {
        title: '数据项描述',
        dataIndex: 'remark',
        key: 'remark',
      },
     ],
    TableData: []
  },//资产扩展字段
  asset_life_period_set: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },
  cabinet_space_set: {
    searchOption: [
      {
        type: "input",
        name: "key_name",
        require: false,
        label: "关键词",
        placeholder: "输入厂商简称/中文名称/公司名称",
      },
    ],
    ButtonArr: [
      {
        ButtonText: "导出",
        Action:'export',
        ClickFun: () => {
        }
      }, {
        ButtonText: "导入",
        Action:'import',
        ClickFun: () => {
        }
      }, {
        ButtonText: "添加",
        Action:'add',
        ClickFun: () => {
        }
      }, {
        ButtonText: "删除",
        Action:'delete',
        ClickFun: () => {
        }
      }
    ],
    TableColumns: [
      {
        title: '厂商简称',
        dataIndex: 'name',
        key: 'name',
        width: 180
      },
      {
        title: '中文名称',
        dataIndex: 'producer',
        key: 'producer',
      },
      {
        title: '公司名称',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '官方站点',
        dataIndex: 'vee',
        key: 'vee',
      },
      {
        title: '是否国产',
        dataIndex: 'noute',
        key: 'noute',
      },
      {
        title: '是否显示中文',
        dataIndex: 'descibe',
        key: 'descibe',
      }],
    TableData: []
  },

}
export const SetConfigForms = {
  scrap_set: {
    Modal: {
      title: "报废的设备",
      width: 650,
      cancel: Function,
      submit: Function
    },
    itemClick:Function,
    FormOnChange: Function,
    Form: {
      col: 2,
      groups:[{
        label:"",
        items:[{
           type: "datepicker",
           name: "scrap_at",
           label: "报废时间",
           data_type: "date",
           required:true,
         },{
           type: "treeselect",
           name: "tree",
           label: "选择报废目录",
           source:'initial',
           required:true,
           data_type: "int"
         }
        ]
      }],
      items: [
        {
          type: "input",
          name: "device_name",
          label: "设备名称",
          required:false,
        },{
          type: "input",
          name: "serial_number",
          label: "序列号",
          required:true,
          
        }, {
          type: "input",
          name: "old_management_ip",
          label: "原管理IP",
          required:false,
        },{
          type:"hidden",
          name:"device_producer"
        },{
          type:"hidden",
          name:"device_model",
          data_type:"string"          
        },{
          type: "input",
          name: "device_producer_name",
          label: "厂商",
          readonly:true,
          required:false,
        },{
          type: "select",
          name: "device_type",
          label: "设备类型",
          source:'initial',
          readonly:true,
          required:true,
        },{
          type: "input",
          name: "device_model_name",
          label: "型号",
          required:false,
        },{
          type: "input",
          name: "old_location",
          label: "原所在位置",
        },{
          type: "datepicker",
          name: "purchase_at",
          label: "采购日期",
        },{
          type: "input",
          name: "old_device_manager",
          label: "原责任人",
        },{
          type: "treeselect",
          name: "old_belong_organization",
          label: "所属组织机构",
          source:'initial',
          
        },{
          type: "textarea",
          name: "remark",
          label: "报废说明",
          col:2
        }
      ]
    },
    Loading: true,
  },
  room_set: {
    Modal: {
      title: "机房",
      width: 750,
      cancel: Function,
      submit: Function
    },
    itemClick:Function,
    FormOnChange: Function,
    Form: {
      col: 2,
      items: [
        {
          type: "input",
          name: "room_name",
          label: "机房名称",
          required:true,
        },{
          type: "input",
          name: "room_code",
          label: "中心编码",
          required:true,
        },{
          type: "select",
          name: "idc_location",
          label: "所在的IDC",
          source:'initial',
        },{
          type: "input",
          name: "asd",
          label: "所在楼座（Error）",
          required:true,
          data_type:'int',
        },{
          type: "input",
          name: "floor",
          label: "所在楼层",
          required:true,
          data_type:'int',
        },{
          type: "input",
          name: "voltage",
          label: "电压",
          data_type: "float",
          require:false,
        },{
          type: "input",
          name: "electric",
          label: "电流",
          data_type: "float",
          require:false,
        },{
          type: "input",
          name: "row_max",
          label: "最大行数",
          data_type: "int",
          required:true,
        },
        {
          type: "input",
          name: "column_max",
          label: "最大列数",
          data_type: "int",
          required:true,
        },
        {
          type: "input",
          name: "cabinet_number",
          label: "可容纳机柜数",
          data_type: "int",
          required:true,
        },
        {
          type: "input",
          name: "room_bearing_capacity",
          label: "机房承重",
          data_type: "int",
          require:false,
        },
        {
          type: "input",
          name: "rated_power",
          label: "额定功率",
          data_type: "float",
          require:false,
        },
        {
          type: "input",
          name: "room_area",
          label: "机房面积",
          data_type: "float",
          require:false,
        },{
          type: "select",
          name: "duty_person_one",
          label: "责任人1",
          source:'initial',
        },{
          type: "select",
          name: "duty_person_two",
          label: "责任人2",
          source:'initial',
        }
      ]
    },
    Loading: true,
  },  
}
