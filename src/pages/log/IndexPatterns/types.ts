export interface IndexPattern {
  id: number;
  datasource_id: number;
  name: string;
  time_field: string;
  hide_system_indices: boolean;
  fields_format: string;
}

export interface FieldConfig {
  attrs: {
    [index: string]: {
      [index: string]: string; // alias
    };
  };
  formatMap: {
    [index: string]: {
      type: string; // date
      params: {
        [index: string]: string; // pattern
      };
    };
  };
  version: number;
}

// ---- 第六步 L2（多数据源）：只追加 fe v9.1.0 同文件里 pub 版没有的类型与一个纯函数，0 行删除。
// 用处：新搬进来的 src/pages/explorer/components/{Links.tsx,RenderValue/*} 与 Loki 日志行组件按绝对路径
// `@/pages/log/IndexPatterns/types` 引它们（5 个文件 6 处），做成单独 shim 反而要改这些复制文件。
// 全部照抄 fe v9.1.0 src/pages/log/IndexPatterns/types.ts:1（import）、:34-38、:40-44、:46-51、:53-59、:61-81、:83-95。
// pub 现有的 IndexPattern / FieldConfig 一个字没动；pub 的 FieldConfig.formatMap 是 fe 版的子集，
// convertToVersion2 对它同样成立。
import { IRawTimeRange } from '@/components/TimeRangePicker';

export interface ILogURL {
  name: string;
  urlTemplate: string;
  field?: string;
}

export interface ILogExtract {
  field: string;
  reg: string;
  newField: string;
}

export interface ILogMappingParams {
  op: string;
  v: string;
  str: string;
  field: string;
}

export interface LinkContext {
  rawValue: object;
  name?: string;
  fieldConfig?: FieldConfigVersion2;
  range?: IRawTimeRange;
  parentKey?: string;
}

export interface FieldConfigVersion2 {
  arr: {
    attrs: {
      // [index: string]: {   这里没有这一层！！
      [index: string]: string;
      // };
    };
    field: string;
    type: string;
    formatMap: {
      type: string; // date
      params: {
        [index: string]: string; // pattern
      };
    };
  }[];
  linkArr: ILogURL[];
  regExtractArr?: ILogExtract[];
  mappingParamsArr?: ILogMappingParams[];
  version: number;
}

export function convertToVersion2(data: FieldConfig): FieldConfigVersion2 {
  const version2Data: FieldConfigVersion2 = {
    arr: Object.keys(data.attrs).map((key) => ({
      attrs: data.attrs[key],
      field: key,
      type: data.formatMap[key]?.type,
      formatMap: data.formatMap[key],
    })),
    linkArr: [],
    version: 2,
  };
  return version2Data;
}
