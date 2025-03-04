export const SetConfigTables = {}
export const SetConfigForms = {
  asset_type_set: {
    Modal: {
      title: "资产类型",
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
          label: "设备类型",
          required: true,
        }, {
          type: "select",
          name: "types",
          label: "类型",
          option: [{ value: 1, label: "设备类型" }, { value: 1, label: "备件设备烈性" }],
          required: true,
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
    itemClick: Function,
    FormOnChange: Function,
    Form: {
      col: 2,
      groups: [],
      items: [
        {
          type: "input",
          name: "name",
          label: "资产名称",
          required: true,
        }, {
          type: "treeselect",
          name: "organization_id",
          label: "所属组织机构",
          data_type: "int",
          required: true,
          source: 'initial',
        }, {
          type: "select",
          name: "type",
          label: "资产类型",
          required: true,
          source: 'initial',
        }, {
          type: "input",
          name: "plugin_version",
          label: "插件版本",
        }, {
          type: "input",
          name: "location",
          label: "资产位置",
        }, {
          type: "select",
          name: "asset_status",
          label: "状态",
          source: 'initial',
        }, {
          type: "treeselect",
          name: "directory_id",
          label: "所在目录",
          data_type: "int",
          required: true,
          source: 'initial',
        }, {
          type: "textarea",
          name: "memo",
          label: "描述",
          col: 2
        }
      ]
    },
    Loading: true,
  }
}
export const unitTypes ={
    'percent-1': "百分比(0-1)",
    'percent-100': "百分比(0-100)",
    'bit': "比特-bit",
    'byte': "字节-byte",
    'S':'时间单位-秒',
    'MS':'时间单位-毫秒',
    'N':'未指定',
};
export const factories = [
       { "key":"Enginetech" , "value":"安擎" }, 
        { "key":"TRUST" , "value":"百信" }, 
        { "key":"HX" , "value":"虹信" }, 
        { "key":"GIGABYTE" , "value":"技嘉" }, 
        { "key":"Yunke" , "value":"神州云科" }, 
        { "key":"synologynas" , "value":"群晖" }, 
        { "key":"Brother" , "value":"兄弟" }, 
        { "key":"GreatWall" , "value":"长城" },
        { "key":"Arista" , "value":"Arista" },
        { "key":"Array" , "value":"华耀" },
        { "key":"H3C" , "value":"华三" }, 
        { "key":"Huawei" , "value":"华为" }, 
        { "key":"Powerleader" , "value":"宝德" },
        { "key":"Suma" , "value":"中科可控" }, 
        { "key":"THTF" , "value":"清华同方" }, 
        { "key":"Toyou" , "value":"同有" }, 
        { "key":"Unis" , "value":"紫光" },
        { "key":"ZTE" , "value":"中兴" }, 
        { "key":"Cisco" , "value":"思科" }, 
        { "key":"Dell" , "value":"戴尔" },
        { "key":"Dell-emc" , "value":"戴尔易安信" }, 
        { "key":"Dellforce10" , "value":"力腾网络" },
        { "key":"Fiberhome" , "value":"烽火" }, 
        { "key":"Fujitsu" , "value":"富士通" }, 
        { "key":"Hikvision" , "value":"海康威视" },
        { "key":"HP" , "value":"惠普" }, 
        { "key":"HPE" , "value":"慧与" }, 
        { "key":"IBM" , "value":"国际商业机器" }, 
        { "key":"Inspur" , "value":"浪潮" },
        { "key":"Ironport" , "value":"Ironport" },
        { "key":"Inventec" , "value":"英业达" }, 
        { "key":"Lenovo" , "value":"联想" }, 
        { "key":"Nettrix" , "value":"宁畅" },
        { "key":"Oracle" , "value":"甲骨文" }, 
        { "key":"Sangfor" , "value":"深信服" }, 
        { "key":"Sugon" , "value":"曙光" },
        { "key":"Supermicro" , "value":"超微" }, 
        { "key":"Xfusion" , "value":"超聚变" },
        { "key":"Venustech" , "value":"启明星辰" }, 
        { "key":"Rorke" , "value":"柏科" }, 
        { "key":"Hitachi" , "value":"日立" },
        { "key":"HDS" , "value":"日立数据" },
        { "key":"Macrosan" , "value":"宏杉" }, 
        { "key":"Netapp" , "value":"网域存储" }, 
        { "key":"Pure" , "value":"Pure" }, 
        { "key":"APC" , "value":" 美国电力转换公司" }, 
        { "key":"360Secworld" , "value":"360网神" },
        { "key":"A10networks" , "value":"睿科网络科技" }, 
        { "key":"Brocade" , "value":"博科通讯" }, 
        { "key":"Checkpoint" , "value":"泰蒂斯" },
        { "key":"Dptech" , "value":"迪普科技" }, 
        { "key":"Fortinet" , "value":"飞塔" }, 
        { "key":"Netscreen" , "value":"Netscreen" },
        { "key":"Paloalto" , "value":"派拓网络" }, 
        { "key":"F5" , "value":"F5" },
        { "key":"Hillstone" , "value":"山石网科" }, 
        { "key":"Infoblox" , "value":"并擎" }, 
        { "key":"Juniper" , "value":"瞻博网络" }, 
        { "key":"Mikrotik" , "value":"Mikrotik" }, 
        { "key":"Radware" , "value":"Radware" },
        { "key":"Topsec" , "value":"天融信" }, 
        { "key":"Watchguard" , "value":"沃奇卫士" }, 
        { "key":"Ruijie" , "value":"锐捷" },
        { "key":"SUN" , "value":"SUN" }, 
        { "key":"FujiXerox" , "value":"富士" },
        { "key":"KonicaMinolta" , "value":"柯尼卡美能达" }, 
        { "key":"Ricoh" , "value":"理光中国" }, 
        { "key":"Sharp" , "value":"夏普" },
        { "key":"SANTAK" , "value":"山特电子" }, 
        { "key":"Sindoh" , "value":"圣度" },
        { "key":"Tong" , "value":"东方通" },
        { "key":"KingBase" , "value":"人大金仓" },
        { "key": "Other", "value": "其它" }
];
export const serviceHierarchyOptions = [
  { value: '网络层', label: '网络层' },
  { value: 'IaaS', label: 'IaaS' },
  { value: 'PaaS', label: 'PaaS' },
  { value: 'SaaS', label: 'SaaS' },
]
export const deviceFormOptions = [
  { value: '物理设备', label: '物理设备' },
  { value: '虚拟设备', label: '虚拟设备' }
]