import data from './data';
import attr from './attr';

export const defaultPortAttr = {
  circle: {
    magnet: true,
    r: 5,
  },
};

export const defaultGroup = {
  groups: {
    default: {
      position: 'center',
      attrs: defaultPortAttr,
    },
  },
};

export const defaultPorts = {
  items: [
    {
      group: 'default',
    },
  ],
};

const shapeDefaultConfigureValue = {
  shape: 'Rect',
  width: 40,
  height: 40,
  ports: {
    ...defaultGroup,
  },
  attrs: {
    body: {
      fill: 'rgba(0,186,136,0)',
      stroke: 'rgba(0,186,136,1)',
      'stroke-width': 2,
    },
  },
};

const iconDefaultConfigureValue = {
  shape: 'Rect',
  width: 40,
  height: 40,
  ports: {
    ...defaultGroup,
  },
  attrs: {
    body: {
      fill: '#6796f5',
      stroke: '#6796f5',
      'stroke-width': 0,
    },
  },
};

export const widgetType = [
  {
    name: '网络资产',
    list: [
      {
        name: '交换机',
        url: '/image/topo/switch.svg',
        code: 'Switch',
      },
      {
        name: '防火墙',
        url: '/image/topo/firewall.svg',
        code: 'Firewall',
      },
      {
        name: '中间件',
        url: '/image/topo/middleware.svg',
        code: 'Middleware',
      },
      {
        name: '数据库',
        url: '/image/topo/database.svg',
        code: 'Database',
      },
      {
        name: '负载',
        url: '/image/topo/lb.svg',
        code: 'LoadBalance',
      },
      {
        name: '服务器',
        url: '/image/topo/server.svg',
        code: 'Server',
      },
    ],
  },
  {
    name: '形状',
    list: [
      {
        name: '矩形',
        url: '',
        code: 'rect',
      },
      {
        name: '圆形',
        url: '',
        code: 'circle',
      },
      {
        name: '椭圆',
        url: '',
        code: 'ellipse',
      },
    ],
  },
  {
    name: '文字',
    list: [
      {
        name: '普通文字',
        url: '',
        code: 'Text',
      },
    ],
  },
];

export const widgetConfigure = {
  Switch: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'Switch',
      data: {
        label: '交换机',
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  Firewall: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'Firewall',
      data: {
        label: '防火墙',
        metric: [{ label: 'cpu使用率' }],
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  Middleware: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'Middleware',
      data: {
        label: '中间件',
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  Database: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'Database',
      data: {
        label: '数据库',
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  LoadBalance: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'LoadBalance',
      data: {
        label: '负载均衡',
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  Server: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'Server',
      data: {
        label: '服务器',
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  rect: {
    configureValue: {
      ...shapeDefaultConfigureValue,
      shape: 'rect',
      width: 100,
      height: 100,
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  circle: {
    configureValue: {
      ...shapeDefaultConfigureValue,
      shape: 'circle',
      width: 100,
      height: 100,
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  ellipse: {
    configureValue: {
      ...shapeDefaultConfigureValue,
      shape: 'ellipse',
      width: 100,
      height: 60,
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
  Text: {
    configureValue: {
      ...iconDefaultConfigureValue,
      shape: 'Text',
      data: {
        label: '文字',
      },
      attrs: {
        text: { 'font-size': 16 },
      },
    },
    configuration: {
      data: data.configure,
      attr: attr.configure,
    },
  },
};
