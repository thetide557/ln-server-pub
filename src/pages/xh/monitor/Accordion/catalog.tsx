import { DictValueEnumObj } from '@/components/DictTag';
import React from 'react';

export const SetConfigTables = {
  asset_room_set: {
    searchOption: [
      {
        type: "select",
        name: "filter",
        require: false,
        // label: "厂商",
        placeholder: "请选择过滤条件",
        // source: 'initial'
      },{
        type: "select",
        name: "device_type",
        require: false,
        // label: "设备类型",
        placeholder: "请选择设备类型",
        // source: 'initial'
      },{
        type: "select",
        name: "producer",
        require: false,
        // label: "厂商",
        placeholder: "请选择厂商",
        // source: 'initial'
      },
      {
        type: "input",
        name: "query",
        require: false,
        // label: "关键词",
        width: "300px",
        placeholder: "IP/名称/序列号",
      },
    ],
    itemClick:Function,
    ButtonArr: [],
    Menu:{
      ClickFun: Function,
      items:  [
        {
          label: '添加',
          key: 'add'
        },


      ]
    },
    TableColumns: [
      {
        title: '管理IP',
        dataIndex: 'management_ip',
        key: 'management_ip',
        width: 180
      },
      {
        title: '设备名称',
        dataIndex: 'device_name',
        key: 'device_name',
      },
      {
        title: '序列号',
        dataIndex: 'serial_number',
        key: 'serial_number',
      },
      {
        title: '设备类型',
        dataIndex: 'device_type',
        key: 'device_type',
      },
      {
        title: '资产状态',
        dataIndex: 'device_status',
        key: 'device_status',
      },
      {
        title: '纳管状态',
        dataIndex: 'managed_state',
        key: 'managed_state',
      },
    ],
    TableData: []
  },//机房设备
  cabinet_room_set: {
    searchOption: [
      {
        type: "select",
        name: "cabinet",
        require: false,
        // label: "厂商",
        placeholder: "请选择机柜空间状态",
        // source: 'initial'
      },
      {
        type: "input",
        name: "query",
        require: false,
        // label: "关键词",
        width: "300px",
        placeholder: "输入机柜编号",
      },
    ],
    itemClick:Function,
    ButtonArr: [],
    Menu:{
      ClickFun: Function,
      items:  [
        {
          label: '添加',
          key: 'add'
        },


      ]
    },
    TableColumns: [
      {
        title: '机柜编号',
        dataIndex: 'cabinet_code',
        key: 'cabinet_code',
        width: 180
      },
      {
        title: '设备数',
        dataIndex: 'asset_number',
        key: 'alias',
      },
      {
        title: '厂商型号',
        dataIndex: 'cabinet_model',
        key: 'cabinet_model',
      },
      {
        title: '剩余U数',
        dataIndex: 'unumber',
        key: 'unumber',
      },
      {
        title: '行',
        dataIndex: 'row_number',
        key: 'row_number',
      },
      {
        title: '所在列',
        dataIndex: 'column_number',
        key: 'column_number',
      },
      {
        title: '分区',
        dataIndex: 'service_partition',
        key: 'service_partition',
      },
    ],
    TableData: []
  },//机柜
  cabinet_group_room_set: {
    searchOption: [
      {
        type: "input",
        name: "cabinet_group_code",
        require: false,
        width: "300px",
        placeholder: "输入机柜组编号/机柜编号",
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
      }
    ],
    TableColumns: [
      {
        title: '机柜组编号',
        dataIndex: 'cabinet_group_code',
        key: 'cabinet_group_code',
        width: 180
      },
      {
        title: '机柜组类型',
        dataIndex: 'cabinet_group_type',
        key: 'cabinet_group_type',
      },
      {
        title: '机柜编号',
        dataIndex: 'cabinet_codes',
        key: 'cabinet_codes',
      },
      {
        title: '设备数',
        dataIndex: 'asset_number',
        key: 'asset_numberbianhao ',
      },
      {
        title: '行',
        dataIndex: 'row',
        key: 'row',
      },
      {
        title: '所在列',
        dataIndex: 'column',
        key: 'column',
      },
    ],
    TableData: []
  },//机柜组
  distribution_frame_room_set: {
    searchOption: [
      {
        type: "select",
        name: "producer",
        require: false,
        // label: "dis_type",
        placeholder: "请选择配线架",
        // source: 'initial'
      },
      {
        type: "input",
        name: "query",
        require: false,
        label: "关键词",
        width: "300px",
        placeholder: "输入配线编号/所在机柜编号",
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
        title: '配线架编号',
        dataIndex: 'dis_frame_code',
        key: 'dis_frame_code',
        width: 180
      },
      {
        title: '已用端口数',
        dataIndex: 'used_port_num',
        key: 'used_port_num',
      },
      {
        title: '总端口数',
        dataIndex: 'total_port_num',
        key: 'total_port_num',
      },
      {
        title: '厂商',
        dataIndex: 'producer_id',
        key: 'producer_id',
      },
      {
        title: '型号',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '位置',
        dataIndex: 'cabinet_location',
        key: 'cabinet_location',
      },
      {
        title: '配线架类型',
        dataIndex: 'dis_type',
        key: 'dis_type',
      },
      {
        title: '责任人（2）',
        dataIndex: 'duty_person_one',
        key: 'duty_person_one',
      },
    ],
    TableData: []
  },//配线架
  pdu_room_set: {
    searchOption: [
      {
        type: "select",
        name: "producer",
        require: false,
        placeholder: "请选择标准",
        // source: 'initial'
      },
      {
        type: "input",
        name: "query",
        require: false,
        width: "300px",
        placeholder: "资产编号/名称/品牌/型号",
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
        title: '资产编号',
        dataIndex: 'assets_code',
        key: 'assets_code',
        width: 180
      },
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
      },
      {
        title: '型号',
        dataIndex: 'model',
        key: 'model',
      },
      {
        title: '限制电压(V)',
        dataIndex: 'limit_voltage',
        key: 'limit_voltage',
      },
      {
        title: '最大耐冲击电流(KA)',
        dataIndex: 'max_electric',
        key: 'max_electric',
      },
      {
        title: '用途',
        dataIndex: 'use',
        key: 'use',
      },
    ],
    TableData: []
  },//PDU  
  

}
export const SetConfigForms = {
  data_center_set: {
    Modal: {
      title: "数据中心",
      width: 650,
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
          name: "datacenter_name",
          label: "中心名称",
          required:true,
        },{
          type: "input",
          name: "datacenter_code",
          label: "中心编码",
          required:false,
        }, {
          type: "input",
          name: "city",
          label: "所在城市",
          required:true,
        },{
          type: "input",
          name: "address",
          label: "所在地址",
          required:true,
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
        },{
          type: "input",
          name: "load_bearing",
          label: "承重",
          data_type: "float",
          require:false,
        },{
          type: "input",
          name: "area",
          label: "面积",
          data_type: "float",
        },{
          type: "input",
          name: "describe",
          label: "描述",
        },{
          type: "treeselect",
          name: "affiliated_organization",
          label: "所属组织",
          source:'initial',
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
    initial:{},
    Form: {
      col: 2,
      items: [],
      groups:[
        {          
          label:"机构基本信息",
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
              required:true,
            },{
              type: "input",
              name: "subgallery",
              label: "所在楼座",
              required:true,
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
            }
          ],
        },        
        {
        label:"责任人信息",
        items:[{
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
      }]
    },
    Loading: true,
  },

  

}
