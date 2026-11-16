/*
 * Copyright 2022 Nightingale Team
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import { Moment } from 'moment';

export type TDurationUnit =
  | 'year'
  | 'years'
  | 'y'
  | 'month'
  | 'months'
  | 'M'
  | 'week'
  | 'weeks'
  | 'isoWeek'
  | 'w'
  | 'day'
  | 'days'
  | 'd'
  | 'hour'
  | 'hours'
  | 'h'
  | 'minute'
  | 'minutes'
  | 'm'
  | 'second'
  | 'seconds'
  | 's'
  | 'millisecond'
  | 'milliseconds'
  | 'ms'
  | 'quarter'
  | 'quarters'
  | 'Q';

export interface ITimeOption {
  start: string;
  end: string;
  display: string;
}

export interface IRawTimeRange {
  start: string | Moment;
  end: string | Moment;
  refreshFlag?: string; // 用于自动刷新场景
}

export interface ITimeRangePickerProps {
  // n20 lead 已转正（拍板 D-23 / D-28）：第 2 轮 es / loki / vl 三路都临时加了这一个成员，合回时只留这一份。
  // 要它的：src/plugins/elasticsearch/ExplorerNG/Main/index.tsx:227、loki/ExplorerNG/Main/index.tsx:154、victorialogs/ExplorerNG/Main/index.tsx:134。
  // fe 出处：fe ee48e701 src/components/TimeRangePicker/types.ts:82
  //   `showMillisecond?: boolean; // 是否在 input 回填值中显示毫秒（固定为 000），默认不显示`。
  // 羚牛这个组件**没有**这个功能（`grep -rn showMillisecond src/components/TimeRangePicker/` 零命中），
  // fe 的实现分散在 TimeRangePicker.tsx 9 处 + index.tsx:41；按任务书第 3 步「不动羚牛已有文件」，
  // 这里**只加类型成员**让 tsc 过：传进来的值不被用到，输入框回填值不显示毫秒（纯显示精度，不影响查询）。
  // 已登记 W-1-拿不准 U-01。
  showMillisecond?: boolean;
  style?: object;
  localKey?: string;
  value?: IRawTimeRange;
  dateFormat?: string;
  onChange?: (value: IRawTimeRange) => void;
  placeholder?: string;
  allowClear?: boolean;
  onClear?: () => void;
  label?: React.ReactElement;
  extraFooter?: (fn: Function) => React.ReactElement;
  disabled?: boolean;
}

export interface ITimeRangePickerWithRefreshProps extends ITimeRangePickerProps {
  refreshTooltip?: string;
  intervalSeconds?: number;
  onIntervalSecondsChange?: (value: number) => void;
}
