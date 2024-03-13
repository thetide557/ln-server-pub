const attr = {
  // 数据项默认值
  configureValue: {},
  // 数据项配置
  configure: [
    {
      componentName: 'SketchPicker',
      label: '填充颜色',
      name: ['body', 'fill'],
      required: false,
      placeholder: '请选择填充颜色',
    },
    {
      componentName: 'SketchPicker',
      label: '边框颜色',
      name: ['body', 'stroke'],
      required: false,
      placeholder: '请选择边框颜色',
    },
    {
      componentName: 'InputNumber',
      label: '边框宽度',
      name: ['body', 'stroke-width'],
      required: false,
      placeholder: '请设置边框宽度',
    },
    {
      componentName: 'InputNumber',
      label: '字体大小',
      name: ['text', 'font-size'],
      required: false,
      placeholder: '请设置边框宽度',
    },
  ],
};

export default attr;
