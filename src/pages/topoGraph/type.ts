interface IFormControlBase {
  componentName: 'Input' | 'SketchPicker' | 'Slider' | 'InputNumber' | 'Switch' | 'Select' | 'JsonEdit' | 'TextArea';
  label: string;
  name: string;
  required: boolean;
  placeholder?: string;
  tooltip?: string;
  relationFields?: string;
  relationValues?: string;
}

interface IFormControlSlider {
  min?: number;
  max?: number;
  step?: number;
}

interface IFormControlSelect {
  options?: {
    code: any;
    name: string;
  }[] | CallableFunction;
}

export type IFormControl = IFormControlBase & IFormControlSlider & IFormControlSelect;

export interface ICoordinateConfigure {
  x?: number;
  y?: number;
  width: number;
  height: number;
}

export interface IScreen {
  gridSize: number;
  gridBorderColor: string;
  horizontalNumber: number;
  verticalNumber: number;
  showAuxiliary: boolean;
  interval: number;
  auxiliaryBorderColor: string;
  width: number;
  height: number;
  backgroundImage?: string;
  backgroundColor: string;
  widgets: IWidget[];
}

export interface IWidget {
  id: string;
  code: string;
  configureValue: any;
  coordinateValue: ICoordinateConfigure;
  dataValue?: IDataConfigure;
  data?: any;
}

export interface IDataConfigure {
  useInterface: boolean;
  dataType: 'mock' | 'url' | 'prometheus' | 'datasource';
  mock?: any;
  url?: string;
  promql?: string;
  method?: string;
  field?: string;
}

export interface IConfigurationBase {
  type?: string;
  label?: string;
  configureValue: any;
  configure: IFormConfiguration;
}

type IFormConfiguration = (
  | IFormControl
  | IFormConfiguration
  | {
      name: string;
      list: IFormControl[] | IFormConfiguration;
      relationFields?: string;
      relationValues?: string;
    }
)[];

export interface IWidgetConfiguration {
  [x: string]: {
    component: any;
    configureValue: {};
    coordinateValue: ICoordinateConfigure;
    dataConfigureValue?: IDataConfigure;
    configuration?: {
      widgetConfigure?: IFormConfiguration;
      dataConfigure?: IFormConfiguration;
      coordinateConfigure?: IFormConfiguration;
    };
    data?: {};
  };
}

export interface IWidgetProps {
  // 数据，模拟跟真实数据都走这里
  data: object;
  // 字段名
  field: string;
  options: any;
}

export interface IEchartOnEventItem {
  name: 'click' | 'dblclick' | 'mousedown' | 'mousemove' | 'mouseup' | 'mouseover' | 'mouseout' | 'globalout' | 'contextmenu';
  fn: (params?: any) => void;
}

// echarts所有主题，这里需要与themes里的THEMES的key保持一致
export type IThemeNames = 'white' | 'dark';

// echarts配置
export interface IEchartConfig {
  style?: any;
  options: any;
  theme?: IThemeNames;
  /**
   * notMerge 可选。
   * 是否不跟之前设置的 option 进行合并。默认为 false。
   * 即表示合并。合并的规则，详见 组件合并模式。
   * 如果为 true，表示所有组件都会被删除，然后根据新 option 创建所有新组件。
   */
  notMerge?: boolean;
  /**
   * lazyUpdate 可选。
   * 在设置完 option 后是否不立即更新图表，默认为 false，即同步立即更新。
   * 如果为 true，则会在下一个 animation frame 中，才更新图表。
   */
  lazyUpdate?: boolean;
  getEchart?: (instance?: any) => void;
  autoplay?: {
    interval: number;
  };
  onEvents?: IEchartOnEventItem[];
}
