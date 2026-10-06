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
  // n20-TODO-lead-导出: victorialogs/ExplorerNG/Main/index.tsx:134 传了 showMillisecond，羚牛这版没有这个 prop
  // n20-TODO-lead-导出: （fe ee48e701 src/components/TimeRangePicker/types.ts:82 有）。这里只临时加类型让 tsc 过；
  // n20-TODO-lead-导出: 真正的「毫秒显示」逻辑要 lead 一起补，改法见 n20/W-3-改动清单.md 第 5 节。
  showMillisecond?: boolean; // 是否在 input 回填值中显示毫秒（固定为 000），默认不显示
}

export interface ITimeRangePickerWithRefreshProps extends ITimeRangePickerProps {
  refreshTooltip?: string;
  intervalSeconds?: number;
  onIntervalSecondsChange?: (value: number) => void;
}
