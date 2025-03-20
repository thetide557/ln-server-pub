export enum PromVisualQueryOperationCategory {
  Aggregations = '聚合',
  BinaryOps = '数值计算',
  Functions = '常用函数',
  Trigonometric = '三角函数',
}

export interface PromVisualQueryBinary<T> {
  operator: string;
  vectorMatchesType?: 'on' | 'ignoring';
  vectorMatches?: string;
  query: T;
}

export interface PromVisualQueryLabelFilter {
  label: string;
  op: string;
  value: string;
}

export type QueryBuilderOperationRenderer = (model: PromVisualQueryOperation, def: QueryBuilderOperationDef, innerExpr: string) => string;
export type VisualQueryOperationParamValue = string | number | boolean;

export interface PromVisualQueryOperation {
  id: string;
  params: VisualQueryOperationParamValue[];
}

export interface QueryWithOperations {
  operations: PromVisualQueryOperation[];
}

export interface PromVisualQuery {
  metric?: string;
  labels: PromVisualQueryLabelFilter[];
  operations: PromVisualQueryOperation[];
  binaryQueries?: Array<PromVisualQueryBinary<PromVisualQuery>>;
}

export enum PromVisualQueryOperationId {
  Abs = 'abs',
  Absent = 'absent',
  AbsentOverTime = 'absent_over_time',
  Acos = 'acos',
  Acosh = 'acosh',
  Asin = 'asin',
  Asinh = 'asinh',
  Atan = 'atan',
  Atanh = 'atanh',
  Avg = 'avg',
  AvgOverTime = 'avg_over_time',
  BottomK = 'bottomk',
  Ceil = 'ceil',
  Changes = 'changes',
  Clamp = 'clamp',
  ClampMax = 'clamp_max',
  ClampMin = 'clamp_min',
  Cos = 'cos',
  Cosh = 'cosh',
  Count = 'count',
  CountOverTime = 'count_over_time',
  CountScalar = 'count_scalar',
  CountValues = 'count_values',
  DayOfMonth = 'day_of_month',
  DayOfWeek = 'day_of_week',
  DaysInMonth = 'days_in_month',
  Deg = 'deg',
  Delta = 'delta',
  Deriv = 'deriv',
  DropCommonLabels = 'drop_common_labels',
  Exp = 'exp',
  Floor = 'floor',
  Group = 'group',
  HistogramQuantile = 'histogram_quantile',
  HoltWinters = 'holt_winters',
  Hour = 'hour',
  Idelta = 'idelta',
  Increase = 'increase',
  Irate = 'irate',
  LabelJoin = 'label_join',
  LabelReplace = 'label_replace',
  Last = 'last',
  LastOverTime = 'last_over_time',
  Ln = 'ln',
  Log10 = 'log10',
  Log2 = 'log2',
  Max = 'max',
  MaxOverTime = 'max_over_time',
  Min = 'min',
  MinOverTime = 'min_over_time',
  Minute = 'minute',
  Month = 'month',
  Pi = 'pi',
  PredictLinear = 'predict_linear',
  Present = 'present',
  PresentOverTime = 'present_over_time',
  Quantile = 'quantile',
  QuantileOverTime = 'quantile_over_time',
  Rad = 'rad',
  Rate = 'rate',
  Resets = 'resets',
  Round = 'round',
  Scalar = 'scalar',
  Sgn = 'sgn',
  Sin = 'sin',
  Sinh = 'sinh',
  Sort = 'sort',
  SortDesc = 'sort_desc',
  Sqrt = 'sqrt',
  Stddev = 'stddev',
  StddevOverTime = 'stddev_over_time',
  Sum = 'sum',
  SumOverTime = 'sum_over_time',
  Tan = 'tan',
  Tanh = 'tanh',
  Time = 'time',
  Timestamp = 'timestamp',
  TopK = 'topk',
  Vector = 'vector',
  Year = 'year',
  ArithmeticBinary = '__arithmetic_binary_operators',
  ComparisonBinary = '__comparison_binary_operators',
  NestedQuery = '__nested_query',
}

export const PromVisualQueryOperationLabel =  {
  "abs": "绝对值",
  "absent": "缺失",
  "absent_over_time": "一段时间内缺失",
  "acos": "反余弦",
  "acosh": "反双曲余弦",
  "asin": "反正弦",
  "asinh": "反双曲正弦",
  "atan": "反正切",
  "atanh": "反双曲正切",
  "avg": "平均值",
  "avg_over_time": "一段时间内的平均值",
  "bottomk": "最小的k个值",
  "ceil": "向上取整",
  "changes": "变化次数",
  "clamp": "限制范围",
  "clamp_max": "最大值限制",
  "clamp_min": "最小值限制",
  "cos": "余弦",
  "cosh": "双曲余弦",
  "count": "计数",
  "count_over_time": "一段时间内的计数",
  "count_scalar": "标量计数",
  "count_values": "值计数",
  "day_of_month": "月份中的天数",
  "day_of_week": "星期几",
  "days_in_month": "月份中的天数",
  "deg": "度",
  "delta": "增量",
  "deriv": "导数",
  "drop_common_labels": "删除公共标签",
  "exp": "指数",
  "floor": "向下取整",
  "group": "分组",
  "histogram_quantile": "直方图分位数",
  "holt_winters": "霍尔特-温特斯预测",
  "hour": "小时",
  "idelta": "瞬时增量",
  "increase": "增加量",
  "irate": "瞬时速率",
  "label_join": "标签合并",
  "label_replace": "标签替换",
  "last": "最后一个值",
  "last_over_time": "一段时间内的最后一个值",
  "ln": "自然对数",
  "log10": "以10为底的对数",
  "log2": "以2为底的对数",
  "max": "最大值",
  "max_over_time": "一段时间内的最大值",
  "min": "最小值",
  "min_over_time": "一段时间内的最小值",
  "minute": "分钟",
  "month": "月份",
  "pi": "圆周率",
  "predict_linear": "线性预测",
  "present": "存在",
  "present_over_time": "一段时间内存在",
  "quantile": "分位数",
  "quantile_over_time": "一段时间内的分位数",
  "rad": "弧度",
  "rate": "速率",
  "resets": "重置次数",
  "round": "四舍五入",
  "scalar": "标量",
  "sgn": "符号函数",
  "sin": "正弦",
  "sinh": "双曲正弦",
  "sort": "排序",
  "sort_desc": "降序排序",
  "sqrt": "平方根",
  "stddev": "标准差",
  "stddev_over_time": "一段时间内的标准差",
  "sum": "总和",
  "sum_over_time": "一段时间内的总和",
  "tan": "正切",
  "tanh": "双曲正切",
  "time": "时间",
  "timestamp": "时间戳",
  "topk": "最大的k个值",
  "vector": "向量",
  "year": "年份",
  "arithmetic_binary": "算术二元操作符",
  "comparison_binary": "比较二元操作符",
  "nested_query": "嵌套查询"
}

export interface QueryBuilderOperationDef<T = any> {
  id: string;
  name: string;
  label: string,
  description?: string;
  documentation?: string;
  params: QueryBuilderOperationParamDef[];
  defaultParams: VisualQueryOperationParamValue[];
  category: string;
  hideFromList?: boolean;
  alternativesKey?: string;
  orderRank?: number;
  renderer: QueryBuilderOperationRenderer;
  addOperationHandler: QueryBuilderAddOperationHandler<T>;
  paramChangedHandler?: QueryBuilderOnParamChangedHandler;
}

export interface QueryBuilderOperationParamDef {
  name: string;
  type: 'string' | 'number' | 'boolean';
  options?:
  | string[]
  | number[]
  | {
    label: string;
    value: string | number;
  }[];
  hideName?: boolean;
  restParam?: boolean;
  optional?: boolean;
  placeholder?: string;
  description?: string;
  minWidth?: number;
  subType?: string;
  runQueryOnEnter?: boolean;
}

export type VisualQueryModeller = any;

export type QueryBuilderAddOperationHandler<T> = (def: QueryBuilderOperationDef, query: T, modeller: VisualQueryModeller) => T;

export type QueryBuilderOnParamChangedHandler = (index: number, operation: PromVisualQueryOperation, operationDef: QueryBuilderOperationDef) => PromVisualQueryOperation;

export type QueryBuilderExplainOperationHandler = (op: PromVisualQueryOperation, def?: QueryBuilderOperationDef) => string;
